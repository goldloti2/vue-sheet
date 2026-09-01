import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { mutateTable } from '@/services/appScript'

export interface PageAction {
  key: string
  label: string
  icon: string
  to?: RouteLocationRaw
  onClick?: () => void
}

export function useNewAction (table: TableKey): PageAction {
  return { key: 'new', label: '新增', icon: mdiPlus, to: `/${table}/new` }
}

export function useEditAction (table: TableKey, row: Ref<{ id: string } | null>) {
  return computed<PageAction[]>(() => row.value
    ? [{ key: 'edit', label: '編輯', icon: mdiPencil, to: `/${table}/${row.value.id}/edit` }]
    : [])
}

export function useDeleteAction (table: TableKey, row: Ref<{ id: string } | null>) {
  const router = useRouter()

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
      await mutateTable('delete', table, { id: row.value.id })
      dialog.open = false
      await router.push(`/${table}`)
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
  const dialog = reactive({
    open: false,
    loading: false,
    error: null as string | null,
  })

  async function confirm () {
    dialog.loading = true
    dialog.error = null

    try {
      await Promise.all([...selectedIds.value].map(id => mutateTable('delete', table, { id })))
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
