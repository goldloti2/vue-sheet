import type { Filters } from '@/schema/filter'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { rowMatcher } from '@/schema/filter'

// 欄位之間為 AND，同一欄的 values 之間為 OR。只檢查 filterable 的欄位，忽略其他 key
export function useFilter<Row extends object> (
  filters: MaybeRefOrGetter<Filters>,
  rows: MaybeRefOrGetter<readonly Row[]>,
  schema: TableSchema,
): ComputedRef<Row[]> {
  return computed(() => {
    const matches = rowMatcher(toValue(filters), schema)
    const list = toValue(rows)
    return matches ? list.filter(row => matches(row)) : [...list]
  })
}
