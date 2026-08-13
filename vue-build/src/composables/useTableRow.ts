import type { TableKey } from '@/schema'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { useTableList } from './useTableList'

export function useTableRow<Row extends { id: string }> (
  table: MaybeRefOrGetter<TableKey>,
  id: MaybeRefOrGetter<string>,
) {
  const { data, loading, error, refresh } = useTableList<Row>(table)

  const row = computed(() => data.value.find(item => item.id === toValue(id)) ?? null)

  return { row, loading, error, refresh }
}
