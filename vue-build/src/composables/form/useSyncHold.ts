import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useTablesStore } from '@/stores/tables'

// 頁面作用中時禁止同步（見 docs/topics/store.md）。表單 composable 於內部呼叫，頁面無須呼叫
export function useSyncHold (): void {
  const store = useTablesStore()
  let release: (() => void) | null = null

  function hold () {
    release ??= store.holdSync()
  }

  function drop () {
    release?.()
    release = null
  }

  onMounted(hold)
  onActivated(hold)
  onDeactivated(drop)
  onUnmounted(drop)
}
