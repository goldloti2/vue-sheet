import type { TableKey } from '@/schema'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, reactive, toValue } from 'vue'
import router, { leaveAfterAction, pushWithDefaults } from '@/router'
import { useTablesStore } from '@/stores/tables'

export interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void
}

export function useNewAction (
  table: TableKey,
  defaults?: MaybeRefOrGetter<Record<string, unknown>>,
): PageAction {
  const path = `/${table}/new`

  return {
    key: 'new',
    label: '新增',
    icon: mdiPlus,
    onClick: () => {
      if (defaults === undefined) {
        void router.push(path)
      } else {
        pushWithDefaults(path, toValue(defaults))
      }
    },
  }
}

export function useEditAction (table: TableKey, row: Ref<{ id: string } | null>) {
  return computed<PageAction[]>(() => {
    const current = row.value
    if (!current) {
      return []
    }

    return [{
      key: 'edit',
      label: '編輯',
      icon: mdiPencil,
      onClick: () => void router.push(`/${table}/${current.id}/edit`),
    }]
  })
}

export function useDeleteAction (table: TableKey, row: Ref<{ id: string } | null>) {
  const store = useTablesStore()

  const dialog = reactive({
    open: false,
    loading: false,
    error: null as string | null,
  })

  async function confirm () {
    if (!row.value) {
      return
    }

    dialog.loading = true
    dialog.error = null

    try {
      await store.remove(table, row.value.id)
      dialog.open = false
      leaveAfterAction(`/${table}`)
    } catch (error) {
      dialog.error = error instanceof Error ? error.message : String(error)
    } finally {
      dialog.loading = false
    }
  }

  function openDialog () {
    dialog.open = true
  }

  const actions = computed<PageAction[]>(() => row.value
    ? [{ key: 'delete', label: '刪除', icon: mdiDelete, onClick: openDialog }]
    : [])

  return { actions, dialog, confirm }
}

export function useBulkDeleteAction (table: TableKey, selectedIds: Ref<ReadonlySet<string>>, onDeleted: () => void) {
  const store = useTablesStore()

  const dialog = reactive({
    open: false,
    loading: false,
    error: null as string | null,
  })

  async function confirm () {
    dialog.loading = true
    dialog.error = null

    try {
      await store.removeMany(table, selectedIds.value)
      dialog.open = false
      onDeleted()
    } catch (error) {
      dialog.error = error instanceof Error ? error.message : String(error)
    } finally {
      dialog.loading = false
    }
  }

  function openDialog () {
    dialog.open = true
  }

  const actions = computed<PageAction[]>(() => selectedIds.value.size > 0
    ? [{ key: 'delete', label: '刪除', icon: mdiDelete, onClick: openDialog }]
    : [])

  return { actions, dialog, confirm }
}
