import type { TableKey } from '@/schema'
import type { Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { computed } from 'vue'

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
  return computed<PageAction[]>(() => row.value
    ? [{ key: 'delete', label: '刪除', icon: mdiDelete, onClick: () => {} }]
    : [])
}
