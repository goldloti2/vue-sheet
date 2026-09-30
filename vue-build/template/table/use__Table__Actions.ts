// 複製到 src/composables/actions/use__Table__Actions.ts
//
// 更多現成的 builder、動作在畫面的位置，見 docs/ui.md 的「動作擺在哪裡」；
// 連續動作（runFlow／runStep）與快速編輯對話框（useQuickEditAction／askFields）
// 見 docs/architecture.md。
import type { FieldActions, NewActionOptions } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { __Table__Row } from '@/schema/tables/__table__'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useBulkDeleteAction, useDeleteAction, useEditAction, useNewAction } from '@/composables/actions/useTableActions'

const TABLE = '__table__' satisfies TableKey

// 這張表的所有動作都從這裡取。呼叫端只給自己有的東西，用不到的動作是空陣列：
// 列表頁通常給 selectedIds/onDone，detail 頁給 row
export interface __Table__ActionOptions extends NewActionOptions {
  row?: Ref<__Table__Row | null>
  selectedIds?: Ref<ReadonlySet<string>>
  // 批次動作（刪除、快速編輯）做完會叫，列表頁拿來清選取
  onDone?: () => void
}

export function use__Table__Actions (options: __Table__ActionOptions = {}) {
  const { row, selectedIds, onDone, ...newOptions } = options
  const none = computed(() => [])

  // detail 頁欄位右邊的動作：欄位 key → 動作，一欄一個。沒列的欄位就沒有按鈕
  const fieldActions: FieldActions = row
    ? {
        // parent: useGoToRefAction(row, 'parent', 'parent'),
      }
    : {}

  // 內建 builder 的文字與圖示有預設，要換就在最後一個參數覆寫：useEditAction(TABLE, row, { label: '修改', icon: mdiFileEdit })
  return {
    new: useNewAction(TABLE, newOptions),
    edit: row ? useEditAction(TABLE, row) : none,
    delete: row ? useDeleteAction(TABLE, row) : none,
    bulkDelete: selectedIds ? useBulkDeleteAction(TABLE, selectedIds, onDone ?? (() => {})) : none,
    fieldActions,
  }
}
