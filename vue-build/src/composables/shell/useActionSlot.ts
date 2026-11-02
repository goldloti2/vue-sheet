import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, onActivated, onDeactivated, onMounted, onUnmounted, provide, shallowRef, watch } from 'vue'
import { usePanelActive } from '@/composables/shell/usePanelActive'

export type SlotSetter<Value> = (value: Value) => void
export type ActionSlotSetter = SlotSetter<(PageAction | null)[]>

// 將頁面的內容登記至 AppShell 的某個位置。頁面不在畫面上時（KeepAlive 保留、非目前頁籤）還原為 empty
export function registerSlot<Value> (key: InjectionKey<SlotSetter<Value>>, source: () => Value, empty: Value): void {
  const setValue = inject(key)
  if (!setValue) {
    return
  }

  const panelActive = usePanelActive()

  // KeepAlive 狀態刻意不是 ref：以 ref 觸發的 watcher 排在該輪最後，會清除接手頁面的登記
  let cached = true
  const onScreen = () => cached && panelActive.value

  const publish = () => {
    if (onScreen()) {
      setValue(source())
    }
  }

  const retract = () => setValue(empty)

  onMounted(publish)

  onActivated(() => {
    cached = true
    publish()
  })

  onDeactivated(() => {
    cached = false
    retract()
  })

  // 已讓出位置時不清除，以免清除接手頁面的登記
  onUnmounted(() => {
    if (onScreen()) {
      retract()
    }
  })

  // 內容改變時（例如動作數量、搜尋的表）跟著更新
  watch(source, value => {
    if (onScreen()) {
      setValue(value)
    }
  })

  // 切換頁籤面板時，離開的面板先清除（pre），進入的面板後登記（post），順序相反時結果為空
  watch(panelActive, active => {
    if (!active) {
      retract()
    }
  })

  watch(panelActive, active => {
    if (active) {
      publish()
    }
  }, { flush: 'post' })
}

// 容器收下內容登記至某個位置的值，再自行決定登記給外層的值（例如 DashboardPage 只取關注面板的那一份）
export function relaySlot<Value> (key: InjectionKey<SlotSetter<Value>>, empty: Value): Readonly<ShallowRef<Value>> {
  const received = shallowRef(empty)
  provide(key, value => {
    received.value = value
  })
  return received
}

// 動作的版本：App Bar 與底部動作列
export function registerActions (key: InjectionKey<ActionSlotSetter>, source: () => (PageAction | null)[]): void {
  registerSlot(key, source, [])
}
