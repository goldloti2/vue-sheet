import { computed, shallowRef } from 'vue'

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

  return { active, clear, count, enter, isSelected, selectedIds, toggle }
}
