import type { AskFieldsOptions } from '@/composables/useAskFields'
import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiChevronRightCircle, mdiClose, mdiContentSave, mdiDelete, mdiOpenInNew, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, toValue } from 'vue'
import { askFields } from '@/composables/useAskFields'
import router, { leaveAfterAction, pushWithDefaults } from '@/router'
import { schemas } from '@/schema'
import { useTablesStore } from '@/stores/tables'

// 有 confirm 就先問再跑 onClick；執行與報錯都在 useActionRunner，頁面只負責宣告
export interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void | Promise<void>
  confirm?: { title: string, text: string }
}

// 每個 builder 都回傳同一種形狀
export type PageActions = ComputedRef<PageAction[]>

// detail 頁的欄位動作：欄位 key → 動作，每欄只用第一個
export type FieldActions = Record<string, PageActions>

// 框架內建動作的預設圖示全在這裡；表單的取消／送出（useTableForm）也從這裡拿
export const actionIcons = {
  new: mdiPlus,
  edit: mdiPencil,
  delete: mdiDelete,
  goToRef: mdiChevronRightCircle,
  openUrl: mdiOpenInNew,
  cancel: mdiClose,
  save: mdiContentSave,
} as const

// 內建 builder 的文字與圖示都有預設，各表要換就在這裡覆寫
export interface ActionLook {
  label?: string
  icon?: string
}

export interface NewActionOptions extends ActionLook {
  defaults?: MaybeRefOrGetter<Record<string, unknown>>
}

export function useNewAction (table: TableKey, options: NewActionOptions = {}): PageActions {
  const path = `/${table}/new`
  const { defaults } = options

  return computed(() => [{
    key: 'new',
    label: options.label ?? '新增',
    icon: options.icon ?? actionIcons.new,
    onClick: () => {
      if (defaults === undefined) {
        void router.push(path)
      } else {
        pushWithDefaults(path, toValue(defaults))
      }
    },
  }])
}

export function useEditAction (table: TableKey, row: Ref<{ id: string } | null>, look: ActionLook = {}): PageActions {
  return computed(() => {
    const current = row.value
    if (!current) {
      return []
    }

    return [{
      key: 'edit',
      label: look.label ?? '編輯',
      icon: look.icon ?? actionIcons.edit,
      onClick: () => void router.push(`/${table}/${current.id}/edit`),
    }]
  })
}

export function useDeleteAction (table: TableKey, row: Ref<{ id: string } | null>, look: ActionLook = {}): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const current = row.value
    if (!current) {
      return []
    }

    return [{
      key: 'delete',
      label: look.label ?? '刪除',
      icon: look.icon ?? actionIcons.delete,
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
  icon: string
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

// 以下三個是 detail 頁的欄位動作（DataDetail 的 fieldActions），一欄一個

// ref 欄位：前往對方的 detail。用 push，回來時這一頁還在
export function useGoToRefAction (row: Ref<object | null>, key: string, refTable: TableKey, look: ActionLook = {}): PageActions {
  return computed(() => {
    const id = (row.value as Record<string, unknown> | null)?.[key]
    if (typeof id !== 'string' || id === '') {
      return []
    }

    return [{
      key: `go-to-${key}`,
      label: look.label ?? '前往',
      icon: look.icon ?? actionIcons.goToRef,
      onClick: () => void router.push(`/${refTable}/${id}`),
    }]
  })
}

// 文字欄位裡是網址：開新分頁
export function useOpenUrlAction (row: Ref<object | null>, key: string, look: ActionLook = {}): PageActions {
  return computed(() => {
    const url = (row.value as Record<string, unknown> | null)?.[key]
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      return []
    }

    return [{
      key: `open-${key}`,
      label: look.label ?? '開啟',
      icon: look.icon ?? actionIcons.openUrl,
      onClick: () => {
        window.open(url, '_blank', 'noopener')
      },
    }]
  })
}

export interface SetFieldOptions {
  label: string
  icon: string
  confirm?: PageAction['confirm']
}

// 立即型：把這一欄改成某個值。value 是函式，點下去那一刻才算（例如 () => new Date()）
export function useSetFieldAction (
  table: TableKey,
  row: Ref<{ id: string } | null>,
  key: string,
  value: () => unknown,
  options: SetFieldOptions,
): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const current = row.value
    if (!current) {
      return []
    }

    return [{
      key: `set-${key}`,
      label: options.label,
      icon: options.icon,
      confirm: options.confirm,
      onClick: () => {
        store.update(table, current.id, { [key]: value() })
      },
    }]
  })
}

export function useBulkDeleteAction (
  table: TableKey,
  selectedIds: Ref<ReadonlySet<string>>,
  onDone: () => void,
  look: ActionLook = {},
): PageActions {
  const store = useTablesStore()

  return computed(() => {
    const ids = selectedIds.value
    if (ids.size === 0) {
      return []
    }

    return [{
      key: 'delete',
      label: look.label ?? '刪除',
      icon: look.icon ?? actionIcons.delete,
      confirm: { title: '刪除確認', text: `確定要刪除選取的 ${ids.size} 個項目嗎?` },
      onClick: async () => {
        await store.removeMany(table, ids)
        onDone()
      },
    }]
  })
}
