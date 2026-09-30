import type { ColumnFilter, Filters } from '@/schema/filter'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { filterableColumns, isActiveFilter, matchesFilter } from '@/schema/filter'

// 欄位之間 AND、同一欄的 values 之間 OR。只看 filterable 的欄位，別的 key 忽略
export function useFilter<Row extends object> (
  filters: MaybeRefOrGetter<Filters>,
  rows: MaybeRefOrGetter<readonly Row[]>,
  schema: TableSchema,
): ComputedRef<Row[]> {
  const columns = filterableColumns(schema)

  return computed(() => {
    const current = toValue(filters)
    const active = columns
      .map(column => ({ key: column.key, filter: current[column.key] }))
      .filter((entry): entry is { key: string, filter: ColumnFilter } => isActiveFilter(entry.filter))

    const list = toValue(rows)
    if (active.length === 0) {
      return [...list]
    }

    return list.filter(row => active.every(({ key, filter }) => matchesFilter((row as Record<string, unknown>)[key], filter)))
  })
}
