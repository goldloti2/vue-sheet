// 複製到 src/composables/actions/use__Table__Actions.ts，並登記於同一資料夾的 index.ts 的 tableActions
//
// 虛擬表不可寫入，只有不修改資料的動作，例如前往 ref 的父列與開啟網址。
// 內建的 builder 與動作於畫面上的位置，見 docs/topics/actions.md。

// 此表的所有動作皆由此取得，頁面以 useActions('__table__') 呼叫
export function use__Table__Actions () {
  return {
    // 前往 ref 的父列，另須 import __Table__Row 與 goToRefAction。詳細頁以 fieldActions 安排至欄位
    // goToSource: (row: __Table__Row) => goToRefAction('source', row.source),
  }
}
