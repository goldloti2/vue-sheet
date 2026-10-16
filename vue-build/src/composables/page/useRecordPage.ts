import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useTableRow } from '@/composables/data/useTable'
import { useRouteId } from '@/composables/navigation/useRouteId'
import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'

// 詳細頁要的東西：網址上的 id + 那一筆。回傳的四樣直接餵給 DetailPage，
// row 另外給 use表名Actions 用（動作要知道操作的是哪一筆）。放在 dashboard 的面板中時，id 改取自互動的選取
export function useRecordPage<Row extends { id: string }> (table: TableKey) {
  const dashboard = useDashboardSelection()
  const id: Readonly<Ref<string>> = dashboard ? computed(() => dashboard.recordId(table)) : useRouteId()
  const { row, loading, error } = useTableRow<Row>(table, id)

  return { id, row, loading, error }
}
