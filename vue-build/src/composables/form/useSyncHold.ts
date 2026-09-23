import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useTablesStore } from '@/stores/tables'

// 這個頁面活著的期間不准同步（見 docs/store.md）。表單 composable 內部會呼叫，頁面不用管
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
