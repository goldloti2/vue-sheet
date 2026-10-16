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

const dashboardSelectionKey: InjectionKey<DashboardSelection> = Symbol('dashboardSelection')

type Fields = Record<string, unknown>

function linked (table: TableKey, side: 'childTable' | 'parentTable') {
  return relations.filter(relation => relation[side] === table && relation.childTable !== relation.parentTable)
}

// 每張父表只取第一個指向它的 ref 欄位
function parentRelations (table: TableKey) {
  return linked(table, 'childTable').filter((relation, index, list) =>
    list.findIndex(candidate => candidate.parentTable === relation.parentTable) === index)
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

  function recordId (table: TableKey): string {
    const own = selected.get(table)
    if (own) {
      return own
    }
    for (const relation of linked(table, 'parentTable')) {
      const childId = selected.get(relation.childTable)
      const parentId = childId ? rowOf(relation.childTable, childId)?.[relation.column] : null
      if (typeof parentId === 'string' && parentId) {
        return parentId
      }
    }
    return ''
  }

  function parentScope (table: TableKey) {
    const conditions = parentRelations(table).flatMap(relation => {
      const parentId = selected.get(relation.parentTable)
      return parentId ? [{ column: relation.column, parentId }] : []
    })
    if (conditions.length === 0) {
      return null
    }
    return (row: object) => conditions.every(({ column, parentId }) => (row as Fields)[column] === parentId)
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

// 不在 dashboard 之內時為 null
export function useDashboardSelection (): DashboardSelection | null {
  return inject(dashboardSelectionKey, null)
}
