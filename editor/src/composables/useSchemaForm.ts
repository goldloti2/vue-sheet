import type { CodeContext, SchemaEdit, SchemaModel, SchemaPath, SchemaTypes } from '../../shared/schema'
import type { InjectionKey, ShallowRef } from 'vue'
import { onBeforeUnmount, shallowRef, toValue, watch } from 'vue'
import { editSchema, fetchCodeContext, fetchDiagnostics, fetchSchemaTypes, parseSchemaText } from '@/api'
import { liveProblems } from '@/components/file/typeScript'
import { useFilesStore } from '@/stores/files'
import { useProblemsStore } from '@/stores/problems'

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

  const apply = (edits: SchemaEdit[], timing: PreviewTiming): Promise<string | null> => {
    const run = queue.then(async () => {
      const path = toValue(pathSource)
      try {
        const result = await editSchema({ text: toValue(textSource), edits })
        model.value = result.model
        modelText = result.text
        files.setText(path, result.text)
        if (timing === 'now') {
          syncPreview()
        } else if (timing === 'soon') {
          files.syncPreviewSoon(path)
        }
        return null
      } catch (error) {
        return (error as Error).message
      }
    })
    queue = run
    return run
  }

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
    restore: async text => {
      const run = queue.then(() => files.setText(toValue(pathSource), text))
      queue = run
      await run
    },
    codeContext: (objectPath, name) => fetchCodeContext({ text: toValue(textSource), objectPath, name }).catch(() => null),
    syncPreview,
  }
}
