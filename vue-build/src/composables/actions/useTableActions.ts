import type { AskFieldsOptions } from '@/composables/shell/useAskFields'
import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiChevronRightCircle, mdiClose, mdiContentSave, mdiDelete, mdiOpenInNew, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, toValue } from 'vue'
import { askFields } from '@/composables/shell/useAskFields'
import router, { leaveAfterAction, pushWithDefaults } from '@/router'
import { schemas } from '@/schema'
import { useTablesStore } from '@/stores/tables'

// 有 confirm 時先詢問再執行 onClick（見 useActionRunner）。放置動作處皆接收 (PageAction | null)[]，略過 null
export interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void | Promise<void>
  confirm?: { title: string, text: string }
  // 列上的動作（schema/view.ts 的 RowActions）顯示為圖示或文字，預設為圖示
  display?: 'icon' | 'text'
}

// 詳細頁的欄位動作：欄位 key → 接收一列並回傳動作的函式，每欄一個
export type FieldActions<Row extends object> = Record<string, (row: Row) => PageAction | null>

// 框架內建動作的預設圖示，包含表單的取消與送出（useTableForm）
export const actionIcons = {
  new: mdiPlus,
  edit: mdiPencil,
  delete: mdiDelete,
  goToRef: mdiChevronRightCircle,
  openUrl: mdiOpenInNew,
  cancel: mdiClose,
  save: mdiContentSave,
} as const

// 內建 builder 的文字與圖示皆有預設，以 builder 的最後一個參數替換
export interface ActionLook {
  label?: string
  icon?: string
}

// 將 builder 包裝為隨資料更新的動作，供各表的 use表名Actions 使用
export function useAction (build: () => PageAction | null): ComputedRef<PageAction | null> {
  return computed(build)
}

// 供詳細頁使用：將以列為參數的動作綁定至目前的列，尚未載入時為 null
export function useRowAction<Row> (row: Ref<Row | null>, build: (row: Row) => PageAction | null): ComputedRef<PageAction | null> {
  return useAction(() => row.value ? build(row.value) : null)
}

// 以下的 builder 皆為一般函式，接收當下的值並回傳動作，不適用時回傳 null（包裝方式見 docs/topics/actions.md）

export interface NewActionOptions {
  defaults?: MaybeRefOrGetter<Record<string, unknown>>
}

export function newAction (table: TableKey, options: NewActionOptions = {}, look: ActionLook = {}): PageAction {
  const path = `/${table}/new`
  const { defaults } = options

  return {
    key: 'new',
    label: look.label ?? '新增',
    icon: look.icon ?? actionIcons.new,
    onClick: () => {
      if (defaults === undefined) {
        void router.push(path)
      } else {
        pushWithDefaults(path, toValue(defaults))
      }
    },
  }
}

export function editAction (table: TableKey, row: { id: string }, look: ActionLook = {}): PageAction {
  return {
    key: 'edit',
    label: look.label ?? '編輯',
    icon: look.icon ?? actionIcons.edit,
    onClick: () => void router.push(`/${table}/${row.id}/edit`),
  }
}

// 刪除的列為目前詳細頁所顯示的列時，自動離開詳細頁。onDone 用於其他額外的處理
export function deleteAction (table: TableKey, row: { id: string }, onDone?: () => void, look: ActionLook = {}): PageAction {
  return {
    key: 'delete',
    label: look.label ?? '刪除',
    icon: look.icon ?? actionIcons.delete,
    confirm: { title: '刪除確認', text: '確定要刪除嗎？' },
    onClick: async () => {
      await useTablesStore().remove(table, row.id)
      onDone?.()
      if (router.currentRoute.value.path === `/${table}/${row.id}`) {
        leaveAfterAction(`/${table}`)
      }
    },
  }
}

export function bulkDeleteAction (table: TableKey, ids: ReadonlySet<string>, onDone?: () => void, look: ActionLook = {}): PageAction | null {
  if (ids.size === 0) {
    return null
  }

  return {
    key: 'delete',
    label: look.label ?? '刪除',
    icon: look.icon ?? actionIcons.delete,
    confirm: { title: '刪除確認', text: `確定要刪除選取的 ${ids.size} 個項目嗎?` },
    onClick: async () => {
      await useTablesStore().removeMany(table, ids)
      onDone?.()
    },
  }
}

export interface QuickEditOptions {
  key?: string
  label: string
  icon: string
  defaults?: AskFieldsOptions['defaults']
  onDone?: () => void
}

// 將選取的列的指定欄位改為同一個值。只選取一列時對話框顯示該列的現值，否則使用 defaults
export function quickEditAction<Row extends { id: string }> (
  table: TableKey,
  keys: (keyof Row & string)[],
  ids: ReadonlySet<string>,
  options: QuickEditOptions,
): PageAction | null {
  if (ids.size === 0) {
    return null
  }

  return {
    key: options.key ?? `quick-edit-${keys.join('-')}`,
    label: options.label,
    icon: options.icon,
    onClick: async () => {
      const store = useTablesStore()
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
  }
}

// 以下三個 builder 常用於詳細頁的欄位動作（DataDetail 的 fieldActions）

// ref 欄位：以 push 前往父列的詳細頁，返回時目前的頁面仍在
export function goToRefAction (row: object, key: string, refTable: TableKey, look: ActionLook = {}): PageAction | null {
  const id = (row as Record<string, unknown>)[key]
  if (typeof id !== 'string' || id === '') {
    return null
  }

  return {
    key: `go-to-${key}`,
    label: look.label ?? '前往',
    icon: look.icon ?? actionIcons.goToRef,
    onClick: () => void router.push(`/${refTable}/${id}`),
  }
}

// 文字欄位的值為網址時，於新分頁開啟
export function openUrlAction (row: object, key: string, look: ActionLook = {}): PageAction | null {
  const url = (row as Record<string, unknown>)[key]
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return null
  }

  return {
    key: `open-${key}`,
    label: look.label ?? '開啟',
    icon: look.icon ?? actionIcons.openUrl,
    onClick: () => {
      window.open(url, '_blank', 'noopener')
    },
  }
}

export interface SetFieldOptions {
  label: string
  icon: string
  confirm?: PageAction['confirm']
}

// 立即型：將此欄改為某個值。value 為函式，於點選時求值（例如 () => new Date()）
export function setFieldAction (
  table: TableKey,
  row: { id: string },
  key: string,
  value: () => unknown,
  options: SetFieldOptions,
): PageAction {
  return {
    key: `set-${key}`,
    label: options.label,
    icon: options.icon,
    confirm: options.confirm,
    onClick: () => {
      useTablesStore().update(table, row.id, { [key]: value() })
    },
  }
}
