import { onScopeDispose, watch } from 'vue'
import { useTablesStore } from '@/stores/tables'

// 有未推送的變更，且最後一次修改後經過 delay 秒仍可同步時，執行 push。delay 為 null 時不啟用
export function useAutoPush (delay: number | null, push: () => Promise<void>): void {
  if (delay === null) {
    return
  }

  const store = useTablesStore()
  let timer: ReturnType<typeof setTimeout> | undefined

  function clear () {
    clearTimeout(timer)
    timer = undefined
  }

  // 每次修改或同步的狀態改變時重新計時。推送失敗後不重試，等到下一次修改
  watch([() => store.edits, () => store.canSync, () => store.hasPending], ([, canSync, hasPending]) => {
    clear()
    if (canSync && hasPending) {
      timer = setTimeout(() => {
        timer = undefined
        void push()
      }, delay * 1000)
    }
  })

  onScopeDispose(clear)
}
