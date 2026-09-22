import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, onActivated, onDeactivated, onUnmounted, watch } from 'vue'

export type SlotSetter<Value> = (value: Value) => void
export type ActionSlotSetter = SlotSetter<PageAction[]>

// 把頁面的東西登記到 `AppShell` 上的某一塊，離開（含被 KeepAlive 收起來）就還原成 empty
export function registerSlot<Value> (key: InjectionKey<SlotSetter<Value>>, source: () => Value, empty: Value): void {
  const setValue = inject(key)
  if (!setValue) {
    return
  }

  let isActive = true

  watch(source, value => {
    if (isActive) {
      setValue(value)
    }
  }, { immediate: true })

  onActivated(() => {
    isActive = true
    setValue(source())
  })

  onDeactivated(() => {
    isActive = false
    setValue(empty)
  })

  onUnmounted(() => {
    setValue(empty)
  })
}

// 動作版：App Bar、底部列
export function registerActions (key: InjectionKey<ActionSlotSetter>, source: () => PageAction[]): void {
  registerSlot(key, source, [])
}
