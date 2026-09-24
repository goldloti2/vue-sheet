import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, onActivated, onDeactivated, onMounted, onUnmounted, watch } from 'vue'
import { usePanelActive } from '@/composables/shell/usePanelActive'

export type SlotSetter<Value> = (value: Value) => void
export type ActionSlotSetter = SlotSetter<PageAction[]>

// 把頁面的東西登記到 `AppShell` 上的某一塊，不在畫面上（被 KeepAlive 收起來、或所在頁籤不是當前）就還原成 empty
export function registerSlot<Value> (key: InjectionKey<SlotSetter<Value>>, source: () => Value, empty: Value): void {
  const setValue = inject(key)
  if (!setValue) {
    return
  }

  const panelActive = usePanelActive()

  // KeepAlive 狀態刻意不是 ref：換頁時舊頁的 deactivated 已經排在新頁的 mounted 前面，
  // 改由 ref 觸發 watcher 的話會被排到那一輪的最後，反而把接手的那一頁清掉
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

  // 已經讓出去的就別再清，不然會把接手的那一頁一起清掉
  onUnmounted(() => {
    if (onScreen()) {
      retract()
    }
  })

  // 內容自己變了（動作數量、搜尋的表…）就跟著更新
  watch(source, value => {
    if (onScreen()) {
      setValue(value)
    }
  })

  // 換頁籤面板：讓場的先清（pre）、進場的後設（post），同一輪裡順序錯了會變成空的
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

// 動作版：App Bar、底部列
export function registerActions (key: InjectionKey<ActionSlotSetter>, source: () => PageAction[]): void {
  registerSlot(key, source, [])
}
