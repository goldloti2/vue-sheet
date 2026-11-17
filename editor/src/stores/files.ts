import type { FileChangedEvent, FileContent, ProjectIndex, WriteResult } from '../../shared/api'
import type { EditorState } from '@codemirror/state'
import { defineStore } from 'pinia'
import { computed, reactive, shallowRef } from 'vue'
import { fetchFile, fetchProjectIndex, onServerEvent, putFile } from '@/api'
import { FILE_CHANGED_EVENT, PROJECT_INDEX_EVENT } from '../../shared/api'

export interface OpenFile {
  path: string
  /** 檔案目前於磁碟上的內容 */
  savedText: string
  /** savedText 的 hash，寫入時用於檢查衝突。檔案已在別處刪除時為 null */
  hash: string | null
  /** 編輯中的內容，與 savedText 不同即為未儲存 */
  text: string
}

const DELETED_MESSAGE = '檔案已在別處刪除。再儲存一次會重新建立這個檔案。'
const CONFLICT_MESSAGE = '檔案已在別處修改。畫面保留你的修改，再儲存一次會覆蓋別處的修改。按「放棄修改」改為顯示檔案目前的內容。'

// 開過的檔案只保留資料。畫面只建立目前的檔案
export const useFilesStore = defineStore('files', () => {
  const paths = shallowRef<string[]>([])
  const tableLabels = shallowRef<Record<string, string>>({})
  const files = reactive(new Map<string, OpenFile>())
  const currentPath = shallowRef<string | null>(null)
  const message = shallowRef<string | null>(null)
  // CodeMirror 的狀態（游標、捲動、復原紀錄）不經過 Vue 的 reactive
  const editorStates = new Map<string, EditorState>()
  // 儲存中的檔案，對應儲存期間收到的最後一個變動。儲存本身引起的變動可能早於儲存的回應送達
  const saving = new Map<string, FileChangedEvent | null>()

  const current = computed(() => currentPath.value === null ? null : files.get(currentPath.value) ?? null)
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
    if (currentPath.value === path) {
      currentPath.value = null
    }
  }

  function setIndex (index: ProjectIndex): void {
    paths.value = index.paths
    tableLabels.value = index.tableLabels
  }

  async function loadIndex (): Promise<void> {
    setIndex(await fetchProjectIndex())
  }

  async function open (path: string): Promise<void> {
    if (!files.has(path)) {
      const content = await fetchFile(path)
      if (!content) {
        message.value = `找不到檔案：${path}`
        return
      }
      remember(content)
    }
    currentPath.value = path
  }

  function setText (path: string, text: string): void {
    const file = files.get(path)
    if (file) {
      file.text = text
    }
  }

  function setEditorState (path: string, state: EditorState): void {
    editorStates.set(path, state)
  }

  function editorState (path: string): EditorState | null {
    return editorStates.get(path) ?? null
  }

  async function save (path: string): Promise<void> {
    const file = files.get(path)
    if (!file || file.text === file.savedText) {
      return
    }
    const sentText = file.text
    saving.set(path, null)
    try {
      const result = await putFile({ path, text: sentText, baseHash: file.hash })
      applySaveResult(file, sentText, result)
    } finally {
      const pending = saving.get(path)
      saving.delete(path)
      // 儲存期間收到的變動，於套用儲存的結果之後才比對 hash
      if (pending) {
        await handleChange(pending)
      }
    }
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

  function discard (path: string): void {
    const file = files.get(path)
    if (file) {
      file.text = file.savedText
      editorStates.delete(path)
    }
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
    tableLabels,
    currentPath,
    current,
    dirtyPaths,
    message,
    loadIndex,
    open,
    setText,
    setEditorState,
    editorState,
    save,
    saveAll,
    discard,
  }
})
