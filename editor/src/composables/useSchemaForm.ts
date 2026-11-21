import type { CodeContext, SchemaEdit, SchemaModel, SchemaPath, SchemaTypes } from '../../shared/schema'
import type { InjectionKey, ShallowRef } from 'vue'
import { onBeforeUnmount, shallowRef, toValue, watch } from 'vue'
import { editSchema, fetchCodeContext, fetchDiagnostics, fetchSchemaTypes, parseSchemaText } from '@/api'
import { liveProblems } from '@/components/file/typeScript'
import { useFilesStore } from '@/stores/files'
import { useProblemsStore } from '@/stores/problems'
import { literalText } from '../../shared/schema'
import { idHeaderOfSchema } from '../../shared/schemaForm'
import { tableKeyOf } from '../../shared/tableKeys'

/** 修改表頭的方式：sheet 為自行修改 Sheet 的表頭，keep 為加上 sheetHeader 保留原表頭 */
export type HeaderChange = 'sheet' | 'keep'

/** 修改後更新預覽的時機：now 立即，soon 稍後，none 由呼叫端自行更新（例如小視窗關閉時） */
export type PreviewTiming = 'now' | 'soon' | 'none'

export interface SchemaForm {
  path: () => string
  /** 目前的內容 */
  text: () => string
  model: Readonly<ShallowRef<SchemaModel | null>>
  types: Readonly<ShallowRef<SchemaTypes | null>>
  /** 依序套用修改。失敗時不修改，回傳錯誤訊息 */
  apply: (edits: SchemaEdit[], timing: PreviewTiming) => Promise<string | null>
  /** 失敗時以提示顯示錯誤訊息 */
  applyOrNotify: (edits: SchemaEdit[], timing: PreviewTiming) => Promise<void>
  /** 修改欄位的 key 與其他檔案中的引用，皆為未儲存的修改。失敗時以提示顯示錯誤訊息，回傳 false */
  renameKey: (oldKey: string, newKey: string) => Promise<boolean>
  /** 修改沒有 sheetHeader 的真實欄位的標籤。sheet 時一併修改 mock CSV 的表頭，皆為未儲存的修改 */
  changeLabel: (columnPath: SchemaPath, oldLabel: string, label: string, change: HeaderChange) => Promise<boolean>
  /** 改回先前的內容，例如取消小視窗中的修改 */
  restore: (text: string) => Promise<void>
  /** 物件屬性的值於整個檔案中的前後文 */
  codeContext: (objectPath: SchemaPath, name: string) => Promise<CodeContext | null>
  syncPreview: () => void
}

export const SCHEMA_FORM_KEY: InjectionKey<SchemaForm> = Symbol('schemaForm')

// 停止修改此毫秒數後，於背景檢查整個檔案
const CHECK_DELAY = 500

let typesRequest: Promise<SchemaTypes> | null = null

// 表單的修改寫入記憶體中的內容，與文字編輯器相同，按儲存才寫入檔案
export function useSchemaForm (pathSource: () => string, textSource: () => string): SchemaForm {
  const files = useFilesStore()
  const problems = useProblemsStore()
  const model = shallowRef<SchemaModel | null>(null)
  const types = shallowRef<SchemaTypes | null>(null)
  // model 對應的內容
  let modelText: string | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let checkTimer: ReturnType<typeof setTimeout> | undefined

  typesRequest ??= fetchSchemaTypes()
  typesRequest.then(result => {
    types.value = result
  }).catch(error => {
    typesRequest = null
    files.message = (error as Error).message
  })

  // 文字編輯器未顯示，未儲存的內容的檢查改由此處執行
  const scheduleCheck = () => {
    clearTimeout(checkTimer)
    checkTimer = setTimeout(async () => {
      const path = toValue(pathSource)
      const text = toValue(textSource)
      const diagnostics = await fetchDiagnostics({ path, text }).catch(() => null)
      if (diagnostics && text === toValue(textSource)) {
        problems.setLive(path, liveProblems(path, text, diagnostics))
      }
    }, CHECK_DELAY)
  }

  watch(textSource, async text => {
    scheduleCheck()
    if (text === modelText) {
      return
    }
    const parsed = await parseSchemaText(text).catch(() => null)
    if (parsed && text === toValue(textSource)) {
      model.value = parsed
      modelText = text
    }
  }, { immediate: true })

  onBeforeUnmount(() => clearTimeout(checkTimer))

  const syncPreview = () => void files.syncPreview(toValue(pathSource))

  // 依序執行。表單的修改不交錯
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task)
    queue = run.catch(() => undefined)
    return run
  }

  // 主鍵的表頭改變時，一併修改 Config.gs 的 idColumn
  const applyNow = async (edits: SchemaEdit[], timing: PreviewTiming): Promise<string | null> => {
    const path = toValue(pathSource)
    try {
      const oldHeader = idHeaderOfSchema(model.value)
      const result = await editSchema({ text: toValue(textSource), edits })
      model.value = result.model
      modelText = result.text
      files.setText(path, result.text)
      const header = idHeaderOfSchema(result.model)
      const tableKey = tableKeyOf(path)
      if (oldHeader !== null && header !== null && oldHeader !== header && tableKey !== null) {
        await files.renameConfigIdColumn(path, tableKey, oldHeader, header)
      }
      if (timing === 'now') {
        syncPreview()
      } else if (timing === 'soon') {
        files.syncPreviewSoon(path)
      }
      return null
    } catch (error) {
      return (error as Error).message
    }
  }

  const apply = (edits: SchemaEdit[], timing: PreviewTiming) => enqueue(() => applyNow(edits, timing))

  const renameKey = (oldKey: string, newKey: string) => enqueue(async () => {
    const error = await files.renameKey(toValue(pathSource), oldKey, newKey)
    if (error) {
      files.message = error
      return false
    }
    syncPreview()
    return true
  })

  const changeLabel = (columnPath: SchemaPath, oldLabel: string, label: string, change: HeaderChange) => enqueue(async () => {
    const path = toValue(pathSource)
    const edits: SchemaEdit[] = [{ kind: 'setProperty', objectPath: columnPath, name: 'label', valueText: literalText(label) }]
    if (change === 'keep') {
      edits.push({ kind: 'setProperty', objectPath: columnPath, name: 'sheetHeader', valueText: literalText(oldLabel), after: 'label' })
    }
    const error = await applyNow(edits, 'now')
    if (error) {
      files.message = error
      return false
    }
    const tableKey = tableKeyOf(path)
    const csvPath = change === 'sheet' && tableKey !== null ? files.mockCsv[tableKey] : undefined
    const csvError = csvPath ? await files.renameMockHeader(path, csvPath, oldLabel, label) : null
    if (csvError) {
      files.message = csvError
    }
    return true
  })

  return {
    path: pathSource,
    text: textSource,
    model,
    types,
    apply,
    applyOrNotify: async (edits, timing) => {
      const error = await apply(edits, timing)
      if (error) {
        files.message = error
      }
    },
    renameKey,
    changeLabel,
    restore: text => enqueue(async () => files.setText(toValue(pathSource), text)),
    codeContext: (objectPath, name) => fetchCodeContext({ text: toValue(textSource), objectPath, name }).catch(() => null),
    syncPreview,
  }
}
