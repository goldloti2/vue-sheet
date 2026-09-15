import type { AskFieldsOptions } from '@/composables/useAskFields'
import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, toValue } from 'vue'
import { askFields } from '@/composables/useAskFields'
import router, { leaveAfterAction, pushWithDefaults } from '@/router'
import { schemas } from '@/schema'
import { useTablesStore } from '@/stores/tables'

// 有 confirm 就先問再跑 onClick；執行與報錯都在 useActionRunner，頁面只負責宣告
export interface PageAction {
  key: string
  label: string
  // FAB 與 App Bar 靠它顯示；底部動作列只用文字，所以可以省略
  icon?: string
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

export interface QuickEditOptions {
  key?: string
  label: string
  icon?: string
  defaults?: AskFieldsOptions['defaults']
  onDone?: () => void
}

// 把選取的幾筆的某幾欄改成同一個值：只選一筆時對話框顯示那筆的現值，否則用 defaults
export function useQuickEditAction<Row extends { id: string }> (
  table: TableKey,
  keys: (keyof Row & string)[],
  selectedIds: Ref<ReadonlySet<string>>,
  options: QuickEditOptions,
): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const ids = selectedIds.value
    if (ids.size === 0) {
      return []
    }

    return [{
      key: options.key ?? `quick-edit-${keys.join('-')}`,
      label: options.label,
      icon: options.icon,
      onClick: async () => {
        const rows = (store.rows[table] as Row[] | undefined)?.filter(row => ids.has(row.id)) ?? []
        const values = await askFields<Row>(schemas[table], keys, { rows, defaults: options.defaults })
        if (!values) {
          return
        }

        for (const id of ids) {
          store.update(table, id, values)
        }
        options.onDone?.()
      },
    }]
  })
}

export function useBulkDeleteAction (
  table: TableKey,
  selectedIds: Ref<ReadonlySet<string>>,
  onDone: () => void,
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
        onDone()
      },
    }]
  })
}
