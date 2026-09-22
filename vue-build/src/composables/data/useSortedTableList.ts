import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { computed } from 'vue'
import { sortRows } from '@/schema/types'
import { useTableList } from './useTableList'

export function useSortedTableList<Row> (
  table: MaybeRefOrGetter<TableKey>,
  schema: TableSchema,
) {
  const { data, loading, error } = useTableList<Row>(table)
  const sortedData = computed(() => sortRows(data.value, schema))

  return {
    data: sortedData,
    loading,
    error,
  }
}
