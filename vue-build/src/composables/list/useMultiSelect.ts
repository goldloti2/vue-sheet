import type { PageAction } from '@/composables/actions/useTableActions'
import { computed, onDeactivated, shallowRef, watch } from 'vue'
import { actionIcons } from '@/composables/actions/useTableActions'
import { useCurrentTab } from '@/composables/shell/useAppBarTabs'

// 多選狀態：selectMode 直接由「有沒有選取任何一筆」推導，不另外存一個 boolean
export function useMultiSelect () {
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set())

  const active = computed(() => selectedIds.value.size > 0)
  const count = computed(() => selectedIds.value.size)

  function isSelected (id: string): boolean {
    return selectedIds.value.has(id)
  }

  function enter (id: string) {
    selectedIds.value = new Set([id])
  }

  function toggle (id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
  }

  function clear () {
    selectedIds.value = new Set()
  }

  // 離開頁面就取消（列表是 KeepAlive 的，不清的話回來還停在上次的多選模式）
  onDeactivated(clear)

  // 換頁籤也算離開。頁籤是 TabView 登記給 AppShell 的，所以頁面層跟面板層都讀得到同一份
  watch(useCurrentTab(), clear)

  // 多選模式的出口，放進 App Bar 動作；沒選東西時是空的，不佔位子
  const cancel = computed<PageAction[]>(() => active.value
    ? [{ key: 'cancel-select', label: '取消', icon: actionIcons.cancel, onClick: clear }]
    : [])

  return { active, cancel, clear, count, enter, isSelected, selectedIds, toggle }
}
