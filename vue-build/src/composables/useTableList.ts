import type { TableKey } from '@/schema'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue, watchEffect } from 'vue'
import { useTablesStore } from '@/stores/tables'

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
    refresh: () => {
      void store.refresh(currentTable.value)
    },
  }
}
