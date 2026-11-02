import { computed, onDeactivated, shallowRef, watch } from 'vue'
import { useCurrentTab } from '@/composables/shell/useCurrentTab'
import { useAppBarSelection } from '@/composables/shell/useShellActions'

// 多選狀態：是否為多選模式由「是否選取任何一列」推導，不另存 boolean
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

  // 離開頁面時取消多選。列表由 KeepAlive 保留，不清除時回到頁面仍為多選模式
  onDeactivated(clear)

  // 切換頁籤也取消多選。目前的頁籤由所在的 TabPage 提供
  watch(useCurrentTab(), clear)

  // 一列多選時所需的屬性，供列表元件以 v-bind 一次綁定
  function itemProps (id: string) {
    return {
      selectable: true,
      selectMode: active.value,
      selected: isSelected(id),
      onLongpress: () => enter(id),
      onToggle: () => toggle(id),
    }
  }

  // 多選模式的出口。此處只提供退出的函式，按鈕由 AppShell 顯示
  useAppBarSelection(() => active.value ? clear : null)

  return { active, clear, count, enter, isSelected, itemProps, selectedIds, toggle }
}

export type MultiSelect = ReturnType<typeof useMultiSelect>
