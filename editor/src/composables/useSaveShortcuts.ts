import { useFilesStore } from '@/stores/files'
import { useEventListener } from './useEventListener'

// Ctrl+S（macOS 為 Cmd+S）儲存目前的檔案或頁面。有未儲存的修改時，關閉分頁前先確認
export function useSaveShortcuts (): void {
  const store = useFilesStore()

  useEventListener(window, 'keydown', event => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (store.currentTarget !== null) {
        void store.requestSave(store.currentTarget)
      }
    }
  })

  useEventListener(window, 'beforeunload', event => {
    if (store.dirtyPaths.size > 0) {
      event.preventDefault()
    }
  })
}
