import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, onActivated, onDeactivated, onUnmounted, watch } from 'vue'

export type ActionSlotSetter = (actions: PageAction[]) => void

// 把頁面的動作註冊到 `AppShell` 上的某一塊（App Bar、底部列）。
export function registerActions (key: InjectionKey<ActionSlotSetter>, source: () => PageAction[]): void {
  const setActions = inject(key)
  if (!setActions) {
    return
  }

  let isActive = true

  watch(source, actions => {
    if (isActive) {
      setActions(actions)
    }
  }, { immediate: true })

  onActivated(() => {
    isActive = true
    setActions(source())
  })

  onDeactivated(() => {
    isActive = false
    setActions([])
  })

  onUnmounted(() => {
    setActions([])
  })
}
