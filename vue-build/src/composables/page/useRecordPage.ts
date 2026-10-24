import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useTableRow } from '@/composables/data/useTable'
import { useRouteId } from '@/composables/navigation/useRouteId'
import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'

// 詳細頁的資料層：網址上的 id 與對應的列。位於 dashboard 的面板中時，id 取自互動的選取
export function useRecordPage<Row extends { id: string }> (table: TableKey) {
  const dashboard = useDashboardSelection()
  const id: Readonly<Ref<string>> = dashboard ? computed(() => dashboard.recordId(table)) : useRouteId()
  const { row, loading, error } = useTableRow<Row>(table, id)

  return { id, row, loading, error }
}
