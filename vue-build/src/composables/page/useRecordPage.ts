import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useTableRow } from '@/composables/data/useTable'
import { useRouteId } from '@/composables/navigation/useRouteId'
import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'

// 詳細頁的資料層：網址上的 id 與對應的列。位於 dashboard 的面板中時，id 取自面板的輸入
export function useRecordPage<Row extends { id: string }> (table: TableKey) {
  const panel = useDashboardPanel()
  const id: Readonly<Ref<string>> = panel ? computed(() => panel.recordId()) : useRouteId()
  const { row, loading, error } = useTableRow<Row>(table, id)

  return { id, row, loading, error }
}
