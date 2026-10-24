// 複製到 src/composables/actions/use__Table__Actions.ts
//
// 內建的 builder、動作於畫面上的位置、連續動作（runFlow、runStep）
// 與快速編輯對話框（quickEditAction、askFields），見 docs/topics/actions.md。
import type { FieldActions, NewActionOptions } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { __Table__Row } from '@/schema/tables/__table__'
import type { Ref } from 'vue'
import { bulkDeleteAction, deleteAction, editAction, newAction, useAction } from '@/composables/actions/useTableActions'

const TABLE = '__table__' satisfies TableKey

// 此表的所有動作皆由此取得。呼叫端只提供自身具備的參數，缺少參數的動作為 null（列表頁通常提供 selectedIds、onDone）
export interface __Table__ActionOptions extends NewActionOptions {
  selectedIds?: Ref<ReadonlySet<string>>
  // 對選取的列執行動作後呼叫，列表頁以此清除選取
  onDone?: () => void
}

export function use__Table__Actions (options: __Table__ActionOptions = {}) {
  const { selectedIds, onDone, ...newOptions } = options

  // 詳細頁的欄位動作：欄位 key → 動作，每欄一個。未列出的欄位沒有按鈕
  const fieldActions: FieldActions<__Table__Row> = {
    // parent: row => goToRefAction(row, 'parent', 'parent'),
  }

  // 內建 builder 的文字與圖示皆有預設值，需要更換時以最後一個參數覆寫：editAction(TABLE, row, { label: '修改', icon: mdiFileEdit })
  return {
    new: useAction(() => newAction(TABLE, newOptions)),
    bulkDelete: useAction(() => selectedIds ? bulkDeleteAction(TABLE, selectedIds.value, onDone) : null),
    // 以列為參數的動作：列表於 view 中直接呼叫，詳細頁以 useRowAction 綁定至目前的列
    edit: (row: __Table__Row) => editAction(TABLE, row),
    delete: (row: __Table__Row) => deleteAction(TABLE, row),
    fieldActions,
    // 連續動作：新增一列，再以其 id 新增一列子列（child），最後前往該列的詳細頁
    // 另須 import mdiPlus、toValue、runFlow 與 runStep（composables/navigation/useFlow）及 router
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
