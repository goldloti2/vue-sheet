import type { TableKey } from '@/schema'
import type { GroupLevel } from '@/schema/group'
import { inject, provide } from 'vue'

// useListPage 交給 ListPage 的值：分組的設定，以及使用者是否選了排序
export interface ListGrouping<Row> {
  levels: () => readonly GroupLevel<Row>[] | undefined
  sorted: () => boolean
}

// 依表區分，同一個元件中可以有多張表的列表
const keyOf = (table: TableKey) => `listGrouping:${table}`

export function provideListGrouping<Row> (table: TableKey, grouping: ListGrouping<Row>): void {
  provide(keyOf(table), grouping)
}

// 沒有 useListPage 時為 null，例如展開頁
export function useListGrouping<Row> (table: TableKey): ListGrouping<Row> | null {
  return inject<ListGrouping<Row> | null>(keyOf(table), null)
}
