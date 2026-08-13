import type { TableKey } from '@/schema'
import type { MaybeRefOrGetter } from 'vue'
import { readonly, shallowRef, toValue, watch } from 'vue'
import { fetchTable } from '@/services/appScript'

export function useTableList<Row> (
  table: MaybeRefOrGetter<TableKey>,
  filters?: MaybeRefOrGetter<Record<string, string> | undefined>,
) {
  const data = shallowRef<Row[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const refreshTrigger = shallowRef(0)

  function refresh () {
    refreshTrigger.value++
  }

  watch(
    [() => toValue(table), () => toValue(filters), refreshTrigger],
    ([currentTable, currentFilters], _prev, onCleanup) => {
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })

      loading.value = true
      error.value = null

      fetchTable<Row>(currentTable, currentFilters)
        .then(result => {
          if (cancelled) {
            return
          }
          data.value = result
        })
        .catch((error_: unknown) => {
          if (cancelled) {
            return
          }
          error.value = error_ instanceof Error ? error_.message : String(error_)
        })
        .finally(() => {
          if (cancelled) {
            return
          }
          loading.value = false
        })
    },
    { immediate: true },
  )

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    refresh,
  }
}
