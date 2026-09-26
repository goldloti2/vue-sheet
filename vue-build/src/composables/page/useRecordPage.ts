import type { TableKey } from '@/schema'
import { useTableRow } from '@/composables/data/useTableRow'
import { useRouteId } from '@/composables/navigation/useRouteId'

// 詳細頁要的東西：網址上的 id + 那一筆。回傳的四樣直接餵給 DetailPage，
// row 另外給 use表名Actions 用（動作要知道操作的是哪一筆）
export function useRecordPage<Row extends { id: string }> (table: TableKey) {
  const id = useRouteId()
  const { row, loading, error } = useTableRow<Row>(table, id)

  return { id, row, loading, error }
}
