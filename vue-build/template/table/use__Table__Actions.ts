// 複製到 src/composables/actions/use__Table__Actions.ts
import type { FieldActions, NewActionOptions } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { __Table__Row } from '@/schema/__table__'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useBulkDeleteAction, useDeleteAction, useEditAction, useGoToRefAction, useNewAction } from '@/composables/actions/useTableActions'

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
  // 現成的 builder：useGoToRefAction（ref 前往對方）、useOpenUrlAction（開網址）、useSetFieldAction（改成某個值）
  const fieldActions: FieldActions = row
    ? {
        // parent: useGoToRefAction(row, 'parent', 'parent'),
        // date: useSetFieldAction(TABLE, row, 'date', () => new Date(), { label: '改成今天', icon: mdiCalendarToday }),
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

// 連續動作：幾個步驟串成一段 async、包在 runFlow 裡，跟其他動作一樣從這裡取（見 README 4.4）。
// 例：新增完直接進那筆的 detail。要用的話在上面的回傳物件多加一個 key：
//
//   newThenView: computed<PageAction[]>(() => [{
//     key: 'new-then-view',
//     label: '新增',
//     icon: mdiPlus,
//     onClick: () => runFlow(async () => {
//       const row = await runStep<__Table__Row>('/__table__/new')
//       router.replace(`/__table__/${row.id}`)
//     }),
//   }]),
//
// 需要 import { runFlow, runStep } from '@/composables/useFlow' 和 router from '@/router'
//
// 只改幾個欄位的小動作用 useQuickEditAction，不用開整頁表單（見 template/README.md）：
//
//   setStatus: selectedIds
//     ? useQuickEditAction<__Table__Row>(TABLE, ['status'], selectedIds, {
//         label: '改狀態',
//         icon: mdiTag,
//         defaults: { status: '選項A' },
//         onDone,
//       })
//     : none,
