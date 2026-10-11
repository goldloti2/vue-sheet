import type { AskFieldsOptions } from '@/composables/shell/useAskFields'
import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiChevronRightCircle, mdiClose, mdiContentSave, mdiDelete, mdiOpenInNew, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, toValue } from 'vue'
import { askFields } from '@/composables/shell/useAskFields'
import router, { pushWithDefaults } from '@/router'
import { schemas } from '@/schema'
import { useTablesStore } from '@/stores/tables'

// 有 confirm 就先問再跑 onClick（見 useActionRunner）；放動作的位置都吃 (PageAction | null)[]，null 略過
export interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void | Promise<void>
  confirm?: { title: string, text: string }
}

// detail 頁的欄位動作：欄位 key → 吃這一列、回傳動作，每欄一個
export type FieldActions<Row extends object> = Record<string, (row: Row) => PageAction | null>

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

// 內建 builder 的文字與圖示都有預設，要換就傳在 builder 的最後一個參數
export interface ActionLook {
  label?: string
  icon?: string
}

// 把 builder 包成會隨資料更新的動作，給各表的 use表名Actions 用
export function useAction (build: () => PageAction | null): ComputedRef<PageAction | null> {
  return computed(build)
}

// detail 頁用：當前那一筆的動作，還沒載到（或沒給 row）就是 null
export function useRowAction<Row> (row: Ref<Row | null> | undefined, build: (row: Row) => PageAction | null): ComputedRef<PageAction | null> {
  return useAction(() => row?.value ? build(row.value) : null)
}

// 以下的 builder 都是一般函式：吃當下的值、回傳一個動作，不適用就回傳 null。
// 各表的 use表名Actions 用 useAction／useRowAction 包起來；detail 的 fieldActions 直接呼叫

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

// onDone 是刪完要做什麼：detail 頁通常是 leaveAfterAction，列表頁是清選取
export function deleteAction (table: TableKey, row: { id: string }, onDone?: () => void, look: ActionLook = {}): PageAction {
  return {
    key: 'delete',
    label: look.label ?? '刪除',
    icon: look.icon ?? actionIcons.delete,
    confirm: { title: '刪除確認', text: '確定要刪除嗎？' },
    onClick: async () => {
      await useTablesStore().remove(table, row.id)
      onDone?.()
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

// 把選取的幾筆的某幾欄改成同一個值：只選一筆時對話框顯示那筆的現值，否則用 defaults
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

// 以下三個常用在 detail 頁的欄位動作（DataDetail 的 fieldActions）

// ref 欄位：前往對方的 detail。用 push，回來時這一頁還在
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

// 文字欄位裡是網址：開新分頁
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

// 立即型：把這一欄改成某個值。value 是函式，點下去那一刻才算（例如 () => new Date()）
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
