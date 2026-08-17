import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { computed } from 'vue'
import { useSortedTableList } from './useSortedTableList'

export function useRelatedRows<Row extends { id: string }> (
  table: MaybeRefOrGetter<TableKey>,
  schema: TableSchema,
  foreignKey: string,
) {
  const { data, loading, error, refresh } = useSortedTableList<Row>(table, schema)

  const byParentId = computed(() => {
    const map = new Map<string, Row[]>()
    for (const row of data.value as Row[]) {
      const parentId = (row as Record<string, unknown>)[foreignKey]
      if (typeof parentId !== 'string') {
        continue
      }
      const list = map.get(parentId)
      if (list) {
        list.push(row)
      } else {
        map.set(parentId, [row])
      }
    }
    return map
  })

  function relatedTo (parentId: string): Row[] {
    return byParentId.value.get(parentId) ?? []
  }

  return {
    data,
    loading,
    error,
    refresh,
    relatedTo,
  }
}
