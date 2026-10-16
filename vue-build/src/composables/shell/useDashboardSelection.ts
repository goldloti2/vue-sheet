import type { TableKey } from '@/schema'
import type { InjectionKey } from 'vue'
import { inject, provide, shallowReactive, watchEffect } from 'vue'
import { relations } from '@/schema/relations'
import { useTablesStore } from '@/stores/tables'

// dashboard 的互動：每張表各記一筆選取，與它直接相關的面板跟著改變（規則見 docs/dashboard.md 的「互動」）
export interface DashboardSelection {
  // 開啟互動時，點擊一列改為選取
  interactive: () => boolean
  selectedId: (table: TableKey) => string | null
  // 點擊一列：選取，已選取的那一列再點一次即取消
  toggle: (table: TableKey, id: string) => void
  // 換成另一筆（詳細面板的上下一筆）
  select: (table: TableKey, id: string) => void
  // 詳細面板顯示的那一筆：同一張表的選取，否則為所選子列所屬的父列；皆無時為空字串
  recordId: (table: TableKey) => string
  // 子表的列表只留所選父列的子列；父表皆未選取時為 null
  parentScope: (table: TableKey) => ((row: object) => boolean) | null
}

// recordId 與 parentScope 另收面板的 via（DashboardPanel 的 prop），由 useDashboardSelection 綁定
interface SelectionState extends Omit<DashboardSelection, 'recordId' | 'parentScope'> {
  recordId: (table: TableKey, via?: string) => string
  parentScope: (table: TableKey, via?: string) => ((row: object) => boolean) | null
}

const dashboardSelectionKey: InjectionKey<SelectionState> = Symbol('dashboardSelection')
// 面板經由哪個 ref 欄位連動，DashboardPanel provide
export const dashboardViaKey: InjectionKey<string | undefined> = Symbol('dashboardVia')

type Fields = Record<string, unknown>

// 自己指向自己的 ref 欄位不連動；給了 via 時只取該欄位
function linked (table: TableKey, side: 'childTable' | 'parentTable', via?: string) {
  return relations.filter(relation => relation[side] === table
    && relation.childTable !== relation.parentTable
    && (!via || relation.column === via))
}

// DashboardPage 呼叫
export function provideDashboardSelection (interactive: () => boolean): void {
  const store = useTablesStore()
  const selected = shallowReactive(new Map<TableKey, string>())

  function rowOf (table: TableKey, id: string): Fields | undefined {
    return (store.rows[table] as (Fields & { id: string })[] | undefined)?.find(row => row.id === id)
  }

  // 連帶清除子表的選取：原本選取的子列可能已不在新的篩選結果中
  function clear (table: TableKey) {
    selected.delete(table)
    for (const relation of linked(table, 'parentTable')) {
      selected.delete(relation.childTable)
    }
  }

  function select (table: TableKey, id: string) {
    if (selected.get(table) !== id) {
      clear(table)
      selected.set(table, id)
    }
  }

  function toggle (table: TableKey, id: string) {
    if (selected.get(table) === id) {
      clear(table)
    } else {
      select(table, id)
    }
  }

  // 子表有多個 ref 欄位指向這張表時，未給 via 即取第一個
  function recordId (table: TableKey, via?: string): string {
    const own = selected.get(table)
    if (own) {
      return own
    }
    for (const relation of linked(table, 'parentTable', via)) {
      const childId = selected.get(relation.childTable)
      const parentId = childId ? rowOf(relation.childTable, childId)?.[relation.column] : null
      if (typeof parentId === 'string' && parentId) {
        return parentId
      }
    }
    return ''
  }

  // 同一張父表的多個 ref 欄位任一等於所選父列即可（例如轉出或轉入帳戶）；不同父表的條件須同時成立
  function parentScope (table: TableKey, via?: string) {
    const conditions = new Map<TableKey, { parentId: string, columns: string[] }>()
    for (const relation of linked(table, 'childTable', via)) {
      const parentId = selected.get(relation.parentTable)
      if (parentId) {
        const condition = conditions.get(relation.parentTable) ?? { parentId, columns: [] }
        condition.columns.push(relation.column)
        conditions.set(relation.parentTable, condition)
      }
    }
    if (conditions.size === 0) {
      return null
    }
    const list = [...conditions.values()]
    return (row: object) => list.every(({ parentId, columns }) =>
      columns.some(column => (row as Fields)[column] === parentId))
  }

  // 選取的那一筆被刪除時，自動取消
  watchEffect(() => {
    const removed = [...selected].filter(([table, id]) => !store.loading[table] && !rowOf(table, id))
    for (const [table] of removed) {
      clear(table)
    }
  })

  provide(dashboardSelectionKey, {
    interactive,
    selectedId: table => selected.get(table) ?? null,
    toggle,
    select,
    recordId,
    parentScope,
  })
}

// 不在 dashboard 之內時為 null；recordId 與 parentScope 已套用所在面板的 via
export function useDashboardSelection (): DashboardSelection | null {
  const state = inject(dashboardSelectionKey, null)
  const via = inject(dashboardViaKey, undefined)
  if (!state) {
    return null
  }
  return {
    ...state,
    recordId: table => state.recordId(table, via),
    parentScope: table => state.parentScope(table, via),
  }
}
