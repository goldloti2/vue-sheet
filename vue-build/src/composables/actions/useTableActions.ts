import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, toValue } from 'vue'
import router, { leaveAfterAction, pushWithDefaults } from '@/router'
import { useTablesStore } from '@/stores/tables'

/**
 * 有 `confirm` 就先跳確認框才執行。對話框由 `AppShell` 統一渲染，`onClick` 回傳的 Promise
 * 由它接住 loading 與錯誤。
 */
export interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void | Promise<void>
  confirm?: { title: string, text: string }
}

// 每個 builder 都回傳同一種形狀
export type PageActions = ComputedRef<PageAction[]>

export interface NewActionOptions {
  defaults?: MaybeRefOrGetter<Record<string, unknown>>
}

export function useNewAction (table: TableKey, options: NewActionOptions = {}): PageActions {
  const path = `/${table}/new`
  const { defaults } = options

  return computed(() => [{
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
  }])
}

export function useEditAction (table: TableKey, row: Ref<{ id: string } | null>): PageActions {
  return computed(() => {
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

export function useDeleteAction (table: TableKey, row: Ref<{ id: string } | null>): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const current = row.value
    if (!current) {
      return []
    }

    return [{
      key: 'delete',
      label: '刪除',
      icon: mdiDelete,
      confirm: { title: '刪除確認', text: '確定要刪除嗎？' },
      onClick: async () => {
        await store.remove(table, current.id)
        leaveAfterAction(`/${table}`)
      },
    }]
  })
}

export function useBulkDeleteAction (
  table: TableKey,
  selectedIds: Ref<ReadonlySet<string>>,
  onDeleted: () => void,
): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const ids = selectedIds.value
    if (ids.size === 0) {
      return []
    }

    return [{
      key: 'delete',
      label: '刪除',
      icon: mdiDelete,
      confirm: { title: '刪除確認', text: `確定要刪除選取的 ${ids.size} 個項目嗎?` },
      onClick: async () => {
        await store.removeMany(table, ids)
        onDeleted()
      },
    }]
  })
}
