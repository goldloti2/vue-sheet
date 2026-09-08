// 複製到 src/composables/actions/use__Table__Actions.ts
import type { NewActionOptions } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { __Table__Row } from '@/schema/__table__'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useBulkDeleteAction, useDeleteAction, useEditAction, useNewAction } from '@/composables/actions/useTableActions'

const TABLE = '__table__' satisfies TableKey

// 這張表的所有動作都從這裡取。呼叫端只給自己有的東西，用不到的動作是空陣列：
// 列表頁通常給 selectedIds/onDeleted，detail 頁給 row
export interface __Table__ActionOptions extends NewActionOptions {
  row?: Ref<__Table__Row | null>
  selectedIds?: Ref<ReadonlySet<string>>
  onDeleted?: () => void
}

export function use__Table__Actions (options: __Table__ActionOptions = {}) {
  const { row, selectedIds, onDeleted, ...newOptions } = options
  const none = computed(() => [])

  return {
    new: useNewAction(TABLE, newOptions),
    edit: row ? useEditAction(TABLE, row) : none,
    delete: row ? useDeleteAction(TABLE, row) : none,
    bulkDelete: selectedIds ? useBulkDeleteAction(TABLE, selectedIds, onDeleted ?? (() => {})) : none,
  }
}
