import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue, watchEffect } from 'vue'
import { sortRows } from '@/schema/types'
import { useTablesStore } from '@/stores/tables'

// 同一張表的三種讀法，都是同一份共用快取（store.rows），所以放同一個檔：
// 整表、整表照 defaultSort 排、單筆。第一次讀到的人負責觸發載入

export function useTableList<Row> (table: MaybeRefOrGetter<TableKey>) {
  const store = useTablesStore()
  const currentTable = computed(() => toValue(table))

  watchEffect(() => {
    void store.ensureLoaded(currentTable.value)
  })

  return {
    data: computed(() => (store.rows[currentTable.value] ?? []) as Row[]),
    loading: computed(() => store.loading[currentTable.value] ?? false),
    error: computed(() => store.error[currentTable.value] ?? null),
  }
}

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

export function useTableRow<Row extends { id: string }> (
  table: MaybeRefOrGetter<TableKey>,
  id: MaybeRefOrGetter<string>,
) {
  const { data, loading, error } = useTableList<Row>(table)

  const row = computed(() => data.value.find(item => item.id === toValue(id)) ?? null)

  return { row, loading, error }
}
