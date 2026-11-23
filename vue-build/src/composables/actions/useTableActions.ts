import type { AskFieldsOptions } from '@/composables/shell/useAskFields'
import type { RealTableKey, TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { mdiChevronRightCircleOutline, mdiContentCopy, mdiDelete, mdiOpenInNew, mdiPencil, mdiPlus } from '@mdi/js'
import { computed, shallowRef, toValue } from 'vue'
import { askFields } from '@/composables/shell/useAskFields'
import { openForm } from '@/composables/shell/useFormLayers'
import router, { leaveAfterAction } from '@/router'
import { schemas } from '@/schema'
import { matchDefaults } from '@/schema/match'
import { rowLabel } from '@/schema/types'
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

// 框架內建動作的預設圖示
export const actionIcons = {
  new: mdiPlus,
  edit: mdiPencil,
  copy: mdiContentCopy,
  delete: mdiDelete,
  goToRef: mdiChevronRightCircleOutline,
  openUrl: mdiOpenInNew,
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

// 列表的多選，即 useListPage 回傳的 selection
export interface ListSelection {
  selectedIds: Readonly<Ref<ReadonlySet<string>>>
  clear: () => void
}

// 只含一列的選取。以列為參數的動作以此呼叫接收選取的 builder，clear 不做任何事
export function selectionOf (row: { id: string }): ListSelection {
  return { selectedIds: shallowRef(new Set([row.id])), clear: () => {} }
}

// 列表頁交給動作的值，即 useListPage 回傳的 selection 與 match
export interface ActionList<Row extends object = object> {
  selection: ListSelection
  match: () => Partial<Row>
}

// 各表的 use表名Actions 的選項。呼叫端只提供自身具備的參數，缺少參數的動作為 null
export interface ActionOptions<Row extends object = object> {
  list?: ActionList<Row>
  // 新增時的預設值，優先於列表的 match
  defaults?: MaybeRefOrGetter<Partial<Row>>
  // 主鍵唯讀，只能由 defaults 帶入
  lockId?: boolean
}

// 新增時的預設值：列表的 match 中的真實欄位，再以 defaults 覆寫
export function newDefaults (table: RealTableKey, options: ActionOptions): Record<string, unknown> {
  const matched = options.list ? matchDefaults(schemas[table], options.list.match() as Record<string, unknown>) : {}
  return { ...matched, ...toValue(options.defaults) }
}

export function newAction (table: RealTableKey, options: ActionOptions = {}, look: ActionLook = {}): PageAction {
  return {
    key: 'new',
    label: look.label ?? '新增',
    icon: look.icon ?? actionIcons.new,
    onClick: () => void openForm(table, { defaults: newDefaults(table, options), lockId: options.lockId }),
  }
}

export function editAction (table: RealTableKey, row: { id: string }, look: ActionLook = {}): PageAction {
  return {
    key: 'edit',
    label: look.label ?? '編輯',
    icon: look.icon ?? actionIcons.edit,
    onClick: () => void openForm(table, { id: row.id }),
  }
}

// 確認後複製一列：主鍵重新發號，其餘真實欄位照抄，完成後前往新的一列。子列不複製。表沒有 newId 時為 null
export function copyAction (table: RealTableKey, row: { id: string }, look: ActionLook = {}): PageAction | null {
  const schema = schemas[table]
  if (!schema.newId) {
    return null
  }

  return {
    key: 'copy',
    label: look.label ?? '複製',
    icon: look.icon ?? actionIcons.copy,
    confirm: { title: '複製確認', text: `確定要複製「${rowLabel(row, schema)}」嗎？` },
    onClick: () => {
      const values = Object.fromEntries(schema.columns
        .filter(column => column.key !== schema.idColumn)
        .map(column => [column.key, (row as Record<string, unknown>)[column.key]]))
      const copied = useTablesStore().create<{ id: string }>(table, values)
      void router.push(`/${table}/${copied.id}`)
    },
  }
}

// 刪除的列為目前詳細頁所顯示的列時，自動離開詳細頁
export function deleteAction (table: RealTableKey, row: { id: string }, look: ActionLook = {}): PageAction {
  return {
    key: 'delete',
    label: look.label ?? '刪除',
    icon: look.icon ?? actionIcons.delete,
    confirm: { title: '刪除確認', text: '確定要刪除嗎？' },
    onClick: async () => {
      await useTablesStore().remove(table, row.id)
      if (router.currentRoute.value.path === `/${table}/${row.id}`) {
        leaveAfterAction(`/${table}`)
      }
    },
  }
}

// 刪除選取的列，完成後清除選取。沒有選取時為 null
export function bulkDeleteAction (table: RealTableKey, selection: ListSelection | undefined, look: ActionLook = {}): PageAction | null {
  const ids = selection?.selectedIds.value
  if (!selection || !ids || ids.size === 0) {
    return null
  }

  return {
    key: 'delete',
    label: look.label ?? '刪除',
    icon: look.icon ?? actionIcons.delete,
    confirm: { title: '刪除確認', text: `確定要刪除選取的 ${ids.size} 個項目嗎?` },
    onClick: async () => {
      await useTablesStore().removeMany(table, ids)
      selection.clear()
    },
  }
}

export interface QuickEditOptions {
  key?: string
  label: string
  icon: string
  defaults?: AskFieldsOptions['defaults']
}

// 將選取的列的指定欄位改為同一個值，完成後清除選取。只選取一列時對話框顯示該列的現值，否則使用 defaults。沒有選取時為 null
export function quickEditAction<Row extends { id: string }> (
  table: RealTableKey,
  keys: (keyof Row & string)[],
  selection: ListSelection | undefined,
  options: QuickEditOptions,
): PageAction | null {
  const ids = selection?.selectedIds.value
  if (!selection || !ids || ids.size === 0) {
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
      selection.clear()
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
  table: RealTableKey,
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
