import type { TableKey } from '@/schema'
import type { AnyTableSchema, RowOf, SortSpec } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue, watchEffect } from 'vue'
import { schemas } from '@/schema'
import { sortRows } from '@/schema/sort'
import { useTablesStore } from '@/stores/tables'

// 讀取共用快取（store.rows）的三種方式：整表、依排序的整表、單一列。第一個讀取者觸發載入。Row 由表的 key 推出

export function useTableList<K extends TableKey> (table: MaybeRefOrGetter<K>) {
  const store = useTablesStore()
  const currentTable = computed(() => toValue(table))

  watchEffect(() => {
    void store.ensureLoaded(currentTable.value)
  })

  return {
    data: computed(() => (store.rows[currentTable.value] ?? []) as RowOf<K>[]),
    loading: computed(() => store.loading[currentTable.value] ?? false),
    error: computed(() => store.error[currentTable.value] ?? null),
  }
}

export function useSortedTableList<K extends TableKey> (
  table: MaybeRefOrGetter<K>,
  // 使用者於排序面板選擇的排序。省略時只依 schema.defaultSort
  sort?: MaybeRefOrGetter<SortSpec[] | null>,
) {
  const { data, loading, error } = useTableList(table)
  const sortedData = computed(() => sortRows(data.value, schemas[toValue(table)] as AnyTableSchema<RowOf<K>>, toValue(sort)))

  return {
    data: sortedData,
    loading,
    error,
  }
}

export function useTableRow<K extends TableKey> (
  table: MaybeRefOrGetter<K>,
  id: MaybeRefOrGetter<string>,
) {
  const { data, loading, error } = useTableList(table)

  const row = computed(() => data.value.find(item => item.id === toValue(id)) ?? null)

  return { row, loading, error }
}
