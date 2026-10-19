// 複製到 src/composables/actions/use__Table__Actions.ts
//
// 現成的 builder、動作在畫面的位置、連續動作（runFlow／runStep）
// 與快速編輯對話框（quickEditAction／askFields），見 docs/topics/actions.md。
import type { FieldActions, NewActionOptions } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { __Table__Row } from '@/schema/tables/__table__'
import type { Ref } from 'vue'
import { bulkDeleteAction, deleteAction, editAction, newAction, useAction } from '@/composables/actions/useTableActions'

const TABLE = '__table__' satisfies TableKey

// 這張表的所有動作皆由此取得。呼叫端只提供自身具備的參數，用不到的動作為 null：
// 列表頁通常提供 selectedIds/onDone
export interface __Table__ActionOptions extends NewActionOptions {
  selectedIds?: Ref<ReadonlySet<string>>
  // 批次動作（刪除、快速編輯）做完會叫，列表頁拿來清選取
  onDone?: () => void
}

export function use__Table__Actions (options: __Table__ActionOptions = {}) {
  const { selectedIds, onDone, ...newOptions } = options

  // detail 頁欄位右邊的動作：欄位 key → 動作，一欄一個。沒列的欄位就沒有按鈕
  const fieldActions: FieldActions<__Table__Row> = {
    // parent: row => goToRefAction(row, 'parent', 'parent'),
  }

  // 內建 builder 的文字與圖示皆有預設值，需要更換時以最後一個參數覆寫：editAction(TABLE, row, { label: '修改', icon: mdiFileEdit })
  return {
    new: useAction(() => newAction(TABLE, newOptions)),
    bulkDelete: useAction(() => selectedIds ? bulkDeleteAction(TABLE, selectedIds.value, onDone) : null),
    // 以列為參數的動作：列表於 view 中直接呼叫，detail 頁以 useRowAction 綁定至當前那一筆
    edit: (row: __Table__Row) => editAction(TABLE, row),
    delete: (row: __Table__Row) => deleteAction(TABLE, row),
    fieldActions,
    // 連續動作：新增一筆，接著帶它的 id 新增一筆子表（child），最後進這筆的 detail
    // 另需 import mdiPlus、toValue、runFlow／runStep（composables/navigation/useFlow）與 router
    // newWithChild: useAction(() => ({
    //   key: 'new-with-child',
    //   label: '新增',
    //   icon: mdiPlus,
    //   onClick: () => runFlow(async () => {
    //     const created = await runStep<__Table__Row>('/__table__/new', toValue(newOptions.defaults))
    //     await runStep<ChildRow>('/child/new', { parent: created.id })
    //     await router.replace(`/__table__/${created.id}`)
    //   }),
    // })),
  }
}
