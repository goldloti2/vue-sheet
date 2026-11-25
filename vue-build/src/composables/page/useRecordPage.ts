import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useTableRow } from '@/composables/data/useTable'
import { useRouteId } from '@/composables/navigation/useRouteId'
import { provideRecordId, useBlockRecordId } from '@/composables/page/childBlock'
import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'

// 詳細頁與展開頁的資料層：網址上的 id 與對應的列，Row 由表的 key 推出。
// 位於子表區塊中時，id 取自外層的詳細頁。位於 dashboard 的面板中時，id 取自面板的輸入
export function useRecordPage<K extends TableKey> (table: K) {
  const blockId = useBlockRecordId(table)
  const panel = useDashboardPanel()
  const id: Readonly<Ref<string>> = blockId ?? (panel ? computed(() => panel.recordId()) : useRouteId())
  const { row, loading, error } = useTableRow(table, id)

  provideRecordId(table, id)

  return { id, row, loading, error }
}
