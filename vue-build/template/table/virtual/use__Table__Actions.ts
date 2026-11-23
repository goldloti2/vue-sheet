// 複製到 src/composables/actions/use__Table__Actions.ts，並登記於同一資料夾的 index.ts 的 tableActions
//
// 虛擬表不可寫入，只有不修改資料的動作，例如前往 ref 的父列與開啟網址。
// 內建的 builder 與動作於畫面上的位置，見 docs/topics/actions.md。
import type { FieldActions } from '@/composables/actions/useTableActions'
import type { __Table__Row } from '@/schema/tables/__table__'

// 此表的所有動作皆由此取得
export function use__Table__Actions () {
  // 詳細頁的欄位動作：欄位 key → 動作，每欄一個。未列出的欄位沒有按鈕
  const fieldActions: FieldActions<__Table__Row> = {
    // source: row => goToRefAction(row, 'source', 'source'),
  }

  return {
    fieldActions,
  }
}
