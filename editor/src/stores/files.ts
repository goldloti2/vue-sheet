import type { FileChangedEvent, FileContent, ProjectIndex, TableSummary, WriteResult } from '../../shared/api'
import type { ConfigTableEntry } from '../../shared/configGs'
import type { NavLink } from '../../shared/navigationForm'
import type { SchemaModel } from '../../shared/schema'
import type { EditorState } from '@codemirror/state'
import { defineStore } from 'pinia'
import { computed, reactive, shallowRef } from 'vue'
import { clearPreviewDrafts, editConfig, fetchFile, fetchProjectIndex, onServerEvent, parseSchemaText, putFile, putPreviewDraft, renameColumnKey } from '@/api'
import { FILE_CHANGED_EVENT, PROJECT_INDEX_EVENT } from '../../shared/api'
import { columnChanges } from '../../shared/columnChanges'
import { CONFIG_DEPLOY_MESSAGE, CONFIG_FILE } from '../../shared/configGs'
import { renameCsvHeader } from '../../shared/csv'
import { FILE_PAGES, FORM_ONLY_FILES, pageOf, targetPaths } from '../../shared/editorPages'
import { navGroups, navLocation } from '../../shared/navGroups'
import { tableKeyOf, TABLES_DIR } from '../../shared/tableKeys'

export interface OpenFile {
  path: string
  /** 檔案目前於磁碟上的內容 */
  savedText: string
  /** savedText 的 hash，寫入時用於檢查衝突。檔案已在別處刪除時為 null */
  hash: string | null
  /** 編輯中的內容，與 savedText 不同即為未儲存 */
  text: string
}

/** 開啟檔案後移至的位置。行與欄從 1 起算 */
export interface RevealTarget {
  path: string
  line: number
  column: number
}

/** 儲存前的確認：要儲存的檔案中有欄位的修改 */
export interface SaveConfirm {
  paths: string[]
  /** 各 schema 檔的欄位的修改 */
  changes: { path: string, title: string, items: string[] }[]
  /** 隨欄位的修改一起改到、但這次不儲存的檔案 */
  unsavedLinked: string[]
}

/** 欄位的修改連帶修改其他檔案的一次操作。放棄 schema 檔的修改時，由後往前反向執行 */
type LinkedEdit
  = | { kind: 'key', oldKey: string, newKey: string }
    | { kind: 'header', csvPath: string, oldHeader: string, header: string }
    | { kind: 'configId', tableKey: string, oldHeader: string, header: string }

// 解析結果的快取保留的份數
const MODEL_CACHE_SIZE = 20

// 表單的勾選、選單等修改後，經過此毫秒數才更新預覽
export const PREVIEW_SYNC_DELAY = 500

const DELETED_MESSAGE = '檔案已在別處刪除。再儲存一次會重新建立這個檔案。'
const CONFLICT_MESSAGE = '檔案已在別處修改。畫面保留你的修改，再儲存一次會覆蓋別處的修改。按「放棄修改」改為顯示檔案目前的內容。'

// 開過的檔案只保留資料。畫面只建立目前的檔案
export const useFilesStore = defineStore('files', () => {
  const paths = shallowRef<string[]>([])
  const tables = shallowRef<Record<string, TableSummary>>({})
  const mockCsv = shallowRef<Record<string, string>>({})
  const tableOrder = shallowRef<string[]>([])
  const csvRows = shallowRef<Record<string, number>>({})
  const configTables = shallowRef<Record<string, ConfigTableEntry> | null>(null)
  const navLinks = shallowRef<NavLink[] | null>(null)
  const files = reactive(new Map<string, OpenFile>())
  // 檔案區開啟的對象：檔案的路徑或頁面的識別值（見 editorPages.ts）
  const currentTarget = shallowRef<string | null>(null)
  // 文字編輯器移至此位置後清除
  const reveal = shallowRef<RevealTarget | null>(null)
  const message = shallowRef<string | null>(null)
  // CodeMirror 的狀態（游標、捲動、復原紀錄）不經過 Vue 的 reactive
  const editorStates = new Map<string, EditorState>()
  // 儲存中的檔案，對應儲存期間收到的最後一個變動。儲存本身引起的變動可能早於儲存的回應送達
  const saving = new Map<string, FileChangedEvent | null>()
  // 預覽目前使用的未儲存內容。沒有項目的檔案，預覽使用檔案的內容
  const previewDrafts = new Map<string, string>()
  const previewTimers = new Map<string, ReturnType<typeof setTimeout>>()
  // 欄位的修改一起改到的其他檔案，例如改 key 時引用的檔案、改表頭時的 mock CSV。schema 檔儲存或放棄修改時解除
  const linked = new Map<string, Set<string>>()
  // 有欄位的修改而停止更新預覽的檔案
  const previewHeld = shallowRef<ReadonlySet<string>>(new Set())
  const saveConfirm = shallowRef<SaveConfirm | null>(null)
  // schema 檔對應連帶修改其他檔案的操作，依操作的順序。schema 檔儲存或放棄修改時清除
  const linkedEdits = new Map<string, LinkedEdit[]>()
  // 內容對應解析的結果
  const modelCache = new Map<string, Promise<SchemaModel | null>>()

  // 對象為頁面時為 null
  const current = computed(() => currentTarget.value === null ? null : files.get(currentTarget.value) ?? null)
  const currentPage = computed(() => currentTarget.value === null ? null : pageOf(currentTarget.value))
  // 對象讀寫的檔案
  const currentPaths = computed(() => currentTarget.value === null ? [] : targetPaths(currentTarget.value))
  // 讀得到 tableLabel 的表
  const tableLabels = computed(() => Object.fromEntries(Object.entries(tables.value)
    .flatMap(([key, table]) => table.label === null ? [] : [[key, table.label]])))
  const navTree = computed(() => navGroups(paths.value, { tableLabels: tableLabels.value, tableOrder: tableOrder.value, mockCsv: mockCsv.value }))
  const dirtyPaths = computed(() => new Set([...files.values()].filter(file => file.text !== file.savedText).map(file => file.path)))

  function remember (content: FileContent): void {
    const file = files.get(content.path)
    if (!file) {
      files.set(content.path, { ...content, savedText: content.text })
      return
    }
    const dirty = file.text !== file.savedText
    file.savedText = content.text
    file.hash = content.hash
    if (!dirty) {
      file.text = content.text
      editorStates.delete(content.path)
    }
  }

  function forget (path: string): void {
    files.delete(path)
    editorStates.delete(path)
    if (currentTarget.value === path) {
      currentTarget.value = null
    }
    void syncPreview(path)
  }

  function setIndex (index: ProjectIndex): void {
    paths.value = index.paths
    tables.value = index.tables
    mockCsv.value = index.mockCsv
    tableOrder.value = index.tableOrder
    csvRows.value = index.csvRows
    configTables.value = index.configTables
    navLinks.value = index.navLinks
  }

  // 編輯器開啟時，清除上次留在預覽中的未儲存內容，並開啟 schemas 中的第一張表
  async function initialize (): Promise<void> {
    const [index] = await Promise.all([fetchProjectIndex(), clearPreviewDrafts()])
    setIndex(index)
    const first = index.tableOrder.map(key => `${TABLES_DIR}${key}.ts`).find(path => index.paths.includes(path))
    if (currentTarget.value === null && first) {
      await open(first)
    }
  }

  /** 檔案於導覽中的位置，例如 頁面/訂單/預設頁。不在導覽中時為路徑 */
  function locationOf (path: string): string {
    return navLocation(navTree.value, path) ?? path
  }

  function parseCached (text: string): Promise<SchemaModel | null> {
    let model = modelCache.get(text)
    if (!model) {
      model = parseSchemaText(text).catch(() => null)
      modelCache.set(text, model)
      for (const old of [...modelCache.keys()].slice(0, -MODEL_CACHE_SIZE)) {
        modelCache.delete(old)
      }
    }
    return model
  }

  /** schema 檔未儲存的內容與檔案之間欄位的修改。其他檔案與沒有修改時為空陣列 */
  async function columnChangesOf (path: string): Promise<string[]> {
    const file = files.get(path)
    if (!file || file.text === file.savedText || tableKeyOf(path) === null) {
      return []
    }
    const { savedText, text } = file
    const [before, after] = await Promise.all([parseCached(savedText), parseCached(text)])
    return before?.schema && after?.schema ? columnChanges(before, savedText, after, text) : []
  }

  /** 記錄 paths 的修改隨 schemaPath 的欄位的修改而來 */
  function linkFiles (schemaPath: string, paths: readonly string[]): void {
    linked.set(schemaPath, new Set([...linked.get(schemaPath) ?? [], ...paths]))
  }

  // schema 檔沒有未儲存的修改時，解除連帶的檔案，並更新它們的預覽
  async function releaseLinked (path: string): Promise<void> {
    const file = files.get(path)
    const others = linked.get(path)
    if (!others || (file && file.text !== file.savedText)) {
      return
    }
    linked.delete(path)
    await Promise.all([...others].map(other => syncPreview(other)))
  }

  // schema 檔有欄位的修改，或檔案隨這樣的 schema 檔一起改到
  async function holdsPreview (path: string): Promise<boolean> {
    const linkedTo = [...linked].filter(([, others]) => others.has(path)).map(([schemaPath]) => schemaPath)
    if (linkedTo.some(schemaPath => dirtyPaths.value.has(schemaPath))) {
      return true
    }
    return (await columnChangesOf(path)).length > 0
  }

  function setHeld (path: string, held: boolean): void {
    if (previewHeld.value.has(path) !== held) {
      const next = new Set(previewHeld.value)
      if (held) {
        next.add(path)
      } else {
        next.delete(path)
      }
      previewHeld.value = next
    }
  }

  // 預覽改用目前未儲存的內容。沒有未儲存的修改時，改回檔案的內容。有欄位的修改時，預覽保留原本的內容
  async function syncPreview (path: string): Promise<void> {
    clearTimeout(previewTimers.get(path))
    previewTimers.delete(path)
    const held = files.has(path) && await holdsPreview(path)
    setHeld(path, held)
    if (held) {
      return
    }
    const file = files.get(path)
    const text = file && file.text !== file.savedText ? file.text : null
    if ((previewDrafts.get(path) ?? null) === text) {
      return
    }
    if (text === null) {
      previewDrafts.delete(path)
    } else {
      previewDrafts.set(path, text)
    }
    await putPreviewDraft({ path, text })
  }

  // 經過 PREVIEW_SYNC_DELAY 沒有再修改時才更新預覽
  function syncPreviewSoon (path: string): void {
    clearTimeout(previewTimers.get(path))
    previewTimers.set(path, setTimeout(() => void syncPreview(path), PREVIEW_SYNC_DELAY))
  }

  /** 讀入記憶體，不切換目前的檔案。回傳是否讀得到 */
  async function load (path: string): Promise<boolean> {
    if (!files.has(path)) {
      const content = await fetchFile(path)
      if (!content) {
        message.value = `找不到檔案：${path}`
        return false
      }
      remember(content)
    }
    return true
  }

  /** 開啟檔案或頁面。頁面讀入它的檔案中存在的檔案。position 只用於有文字編輯器的檔案 */
  async function open (requested: string, position?: { line: number, column: number }): Promise<void> {
    const target = FILE_PAGES[requested] ?? requested
    const page = pageOf(target)
    if (page) {
      await Promise.all(page.paths.filter(path => paths.value.includes(path)).map(path => load(path)))
    } else if (!await load(target)) {
      return
    }
    currentTarget.value = target
    const formOnly = FORM_ONLY_FILES.has(requested)
    reveal.value = position && !page && !formOnly ? { path: target, ...position } : null
    if (position && formOnly) {
      message.value = `${requested} 只有表單。第 ${position.line} 行請以其他編輯器修改。`
    }
  }

  function clearReveal (): void {
    reveal.value = null
  }

  function setText (path: string, text: string): void {
    const file = files.get(path)
    if (file) {
      file.text = text
    }
  }

  /** 記憶體中的內容。尚未讀入時為 null */
  function textOf (path: string): string | null {
    return files.get(path)?.text ?? null
  }

  /** 修改檔案的內容。尚未讀入時，以 base 為檔案的內容 */
  function setDraft (path: string, text: string, base: FileContent | null): void {
    if (!files.has(path) && base) {
      remember(base)
    }
    setText(path, text)
  }

  function recordLinkedEdit (path: string, edit: LinkedEdit): void {
    linkedEdits.set(path, [...linkedEdits.get(path) ?? [], edit])
  }

  // 修改 schema 檔中欄位的 key，以及其他檔案中的引用，皆為未儲存的修改。失敗時拋出錯誤
  async function applyKeyRename (path: string, oldKey: string, newKey: string): Promise<void> {
    const result = await renameColumnKey({ path, text: files.get(path)?.text ?? '', oldKey, newKey, drafts: draftsExcept(path) })
    setText(path, result.text)
    for (const other of result.others) {
      setDraft(other.path, other.text, other.base)
    }
    linkFiles(path, result.others.map(other => other.path))
  }

  // CSV 的表頭中名為 oldHeader 的格改為 header，為未儲存的修改。回傳是否找到該格
  async function applyHeaderRename (path: string, csvPath: string, oldHeader: string, header: string): Promise<boolean> {
    const csv = await load(csvPath) ? textOf(csvPath) : null
    const text = csv === null ? null : renameCsvHeader(csv, oldHeader, header)
    if (text === null) {
      return false
    }
    setText(csvPath, text)
    linkFiles(path, [csvPath])
    return true
  }

  // Config.gs 中此表的 idColumn 由 oldHeader 改為 header，為未儲存的修改。回傳是否修改
  async function applyConfigIdRename (path: string, tableKey: string, oldHeader: string, header: string): Promise<boolean> {
    const text = await load(CONFIG_FILE) ? textOf(CONFIG_FILE) : null
    if (text === null) {
      return false
    }
    const result = await editConfig({ text, edits: [{ kind: 'renameIdColumn', key: tableKey, oldHeader, header }] }).catch(() => null)
    if (result === null || result.text === text) {
      return false
    }
    setText(CONFIG_FILE, result.text)
    linkFiles(path, [CONFIG_FILE])
    return true
  }

  /** 主鍵的表頭改變時，修改 Config.gs 中此表的 idColumn，並記錄此操作。idColumn 不是 oldHeader 時不修改 */
  async function renameConfigIdColumn (path: string, tableKey: string, oldHeader: string, header: string): Promise<void> {
    if (await applyConfigIdRename(path, tableKey, oldHeader, header)) {
      recordLinkedEdit(path, { kind: 'configId', tableKey, oldHeader, header })
    }
  }

  /** 修改欄位的 key 與其他檔案中的引用，並記錄此操作。失敗時回傳錯誤訊息 */
  async function renameKey (path: string, oldKey: string, newKey: string): Promise<string | null> {
    try {
      await applyKeyRename(path, oldKey, newKey)
    } catch (error) {
      return (error as Error).message
    }
    recordLinkedEdit(path, { kind: 'key', oldKey, newKey })
    return null
  }

  /** 修改表的 mock CSV 的表頭，並記錄此操作。找不到原表頭時回傳錯誤訊息 */
  async function renameMockHeader (path: string, csvPath: string, oldHeader: string, header: string): Promise<string | null> {
    if (!await applyHeaderRename(path, csvPath, oldHeader, header)) {
      return `${locationOf(csvPath)} 中沒有表頭「${oldHeader}」，CSV 沒有修改。`
    }
    recordLinkedEdit(path, { kind: 'header', csvPath, oldHeader, header })
    return null
  }

  // 由後往前反向執行連帶的修改。回傳無法還原的項目
  async function revertLinkedEdits (path: string): Promise<string[]> {
    const edits = linkedEdits.get(path) ?? []
    linkedEdits.delete(path)
    const failed: string[] = []
    for (const edit of edits.toReversed()) {
      if (edit.kind === 'key') {
        try {
          await applyKeyRename(path, edit.newKey, edit.oldKey)
        } catch (error) {
          failed.push(`欄位 ${edit.newKey} 改回 ${edit.oldKey}：${(error as Error).message}`)
        }
      } else if (edit.kind === 'header') {
        if (!await applyHeaderRename(path, edit.csvPath, edit.header, edit.oldHeader)) {
          failed.push(`${locationOf(edit.csvPath)} 的表頭「${edit.header}」改回「${edit.oldHeader}」：CSV 中沒有表頭「${edit.header}」。`)
        }
      } else if (!await applyConfigIdRename(path, edit.tableKey, edit.header, edit.oldHeader)) {
        failed.push(`Config.gs 中 ${edit.tableKey} 的 idColumn「${edit.header}」改回「${edit.oldHeader}」：idColumn 已不是「${edit.header}」。`)
      }
    }
    return failed
  }

  function setEditorState (path: string, state: EditorState): void {
    editorStates.set(path, state)
  }

  function editorState (path: string): EditorState | null {
    return editorStates.get(path) ?? null
  }

  // 未儲存的內容。path 以外有未儲存修改的檔案
  function draftsExcept (path: string): { path: string, text: string }[] {
    return [...dirtyPaths.value].filter(dirty => dirty !== path).map(dirty => ({ path: dirty, text: files.get(dirty)!.text }))
  }

  /** 回傳是否已寫入。沒有未儲存的修改時為 true */
  async function save (path: string): Promise<boolean> {
    const file = files.get(path)
    if (!file || file.text === file.savedText) {
      return true
    }
    const sentText = file.text
    saving.set(path, null)
    let result: WriteResult
    try {
      result = await putFile({ path, text: sentText, baseHash: file.hash })
      applySaveResult(file, sentText, result)
    } finally {
      const pending = saving.get(path)
      saving.delete(path)
      // 儲存期間收到的變動，於套用儲存的結果之後才比對 hash
      if (pending) {
        await handleChange(pending)
      }
    }
    if (result.ok) {
      linkedEdits.delete(path)
      if (path === CONFIG_FILE) {
        message.value = CONFIG_DEPLOY_MESSAGE
      }
    }
    await syncPreview(path)
    await releaseLinked(path)
    return result.ok
  }

  function applySaveResult (file: OpenFile, sentText: string, result: WriteResult): void {
    if (result.ok) {
      file.savedText = result.file.text
      file.hash = result.file.hash
      // 儲存期間沒有再修改時，改為顯示修正格式後的內容
      if (file.text === sentText && file.text !== result.file.text) {
        file.text = result.file.text
        editorStates.delete(file.path)
      }
    } else if (result.file) {
      remember(result.file)
      message.value = CONFLICT_MESSAGE
    } else {
      file.hash = null
      message.value = DELETED_MESSAGE
    }
  }

  async function saveAll (): Promise<void> {
    for (const path of dirtyPaths.value) {
      await save(path)
    }
  }

  // 要儲存的檔案中有欄位的修改時，先請使用者確認
  async function requestSaving (paths: string[]): Promise<void> {
    const found = await Promise.all(paths.map(async path => ({ path, items: await columnChangesOf(path) })))
    const changes = found.filter(change => change.items.length > 0).map(change => {
      const key = tableKeyOf(change.path)
      return { ...change, title: key === null ? change.path : tableLabels.value[key] ?? key }
    })
    if (changes.length === 0) {
      for (const path of paths) {
        await save(path)
      }
      return
    }
    const others = new Set(paths.flatMap(path => [...linked.get(path) ?? []]))
    const unsavedLinked = [...others].filter(other => dirtyPaths.value.has(other) && !paths.includes(other)).toSorted()
    saveConfirm.value = { paths, changes, unsavedLinked }
  }

  /** 儲存一個檔案，或頁面的所有檔案。有欄位的修改時先確認 */
  function requestSave (target: string): Promise<void> {
    return requestSaving(targetPaths(target))
  }

  /** 儲存所有未儲存的檔案。有欄位的修改時先確認 */
  function requestSaveAll (): Promise<void> {
    return requestSaving([...dirtyPaths.value])
  }

  async function confirmSave (): Promise<void> {
    const confirmed = saveConfirm.value
    saveConfirm.value = null
    for (const path of confirmed?.paths ?? []) {
      await save(path)
    }
  }

  function cancelSave (): void {
    saveConfirm.value = null
  }

  /** 放棄一個檔案，或頁面的所有檔案的未儲存的修改 */
  async function discard (target: string): Promise<void> {
    for (const path of targetPaths(target)) {
      await discardFile(path)
    }
  }

  // 連帶修改其他檔案的操作先反向執行
  async function discardFile (path: string): Promise<void> {
    const failed = await revertLinkedEdits(path)
    const file = files.get(path)
    if (file) {
      file.text = file.savedText
      editorStates.delete(path)
    }
    if (failed.length > 0) {
      message.value = `下列修改無法還原，請自行修改：${failed.join(' ')}`
    }
    await syncPreview(path)
    await releaseLinked(path)
  }

  async function handleChange ({ path, hash }: FileChangedEvent): Promise<void> {
    if (saving.has(path)) {
      saving.set(path, { path, hash })
      return
    }
    const file = files.get(path)
    if (!file || file.hash === hash) {
      return
    }
    if (hash === null) {
      if (file.text === file.savedText) {
        forget(path)
      } else {
        file.hash = null
        message.value = DELETED_MESSAGE
      }
      return
    }
    const dirty = file.text !== file.savedText
    const content = await fetchFile(path)
    if (content) {
      remember(content)
      if (dirty) {
        message.value = CONFLICT_MESSAGE
      }
    }
  }

  onServerEvent<FileChangedEvent>(FILE_CHANGED_EVENT, event => void handleChange(event))
  onServerEvent<ProjectIndex>(PROJECT_INDEX_EVENT, setIndex)

  return {
    paths,
    tables,
    mockCsv,
    tableOrder,
    csvRows,
    configTables,
    navLinks,
    tableLabels,
    currentTarget,
    reveal,
    current,
    currentPage,
    currentPaths,
    dirtyPaths,
    previewHeld,
    saveConfirm,
    message,
    initialize,
    load,
    open,
    clearReveal,
    setText,
    textOf,
    locationOf,
    setDraft,
    linkFiles,
    renameKey,
    renameMockHeader,
    renameConfigIdColumn,
    columnChangesOf,
    setEditorState,
    editorState,
    draftsExcept,
    save,
    saveAll,
    requestSave,
    requestSaveAll,
    confirmSave,
    cancelSave,
    discard,
    syncPreview,
    syncPreviewSoon,
  }
})
