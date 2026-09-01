import type { TableKey } from '@/schema'
import { computed } from 'vue'
import { schemas } from '@/schema'
import { getRelation } from '@/schema/relations'
import { useSortedTableList } from './useSortedTableList'

export function useRelatedRows<Row extends { id: string }> (
  childTable: TableKey,
  parentTable: TableKey,
) {
  const { column } = getRelation(childTable, parentTable)
  const { data, loading, error, refresh } = useSortedTableList<Row>(childTable, schemas[childTable])

  const byParentId = computed(() => {
    const map = new Map<string, Row[]>()
    for (const row of data.value as Row[]) {
      const parentId = (row as Record<string, unknown>)[column]
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
