import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { effectScope, inject, provide, ref, shallowReactive } from 'vue'
import { useSortedTableList } from '@/composables/data/useTable'
import { registerSlot } from '@/composables/shell/useActionSlot'
import { listControlsKey } from '@/composables/shell/useListControls'
import { hasActiveFilter, rowMatcher } from '@/schema/filter'
import { relations } from '@/schema/relations'

type RowTest = (row: object) => boolean

// 同一張表的列表共用的部分：依共用排序排列的整表、篩選條件與排序
export interface SharedTable<Row = object> {
  allRows: ComputedRef<Row[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  filters: Ref<Filters>
  sort: Ref<SortSpec | null>
}

export interface SharedListControls {
  query: Ref<string>
  // 取得此表共用的部分，由第一個加入的列表建立
  join: <Row>(table: TableKey, schema: TableSchema) => SharedTable<Row>
  // 上層的條件：此表的列，其父列須符合父表的條件（多層）。未開啟連動或上層皆無條件時為 null
  upperFilter: (table: TableKey, via?: string) => RowTest | null
}

const sharedListControlsKey: InjectionKey<SharedListControls> = Symbol('sharedListControls')

// 此表指向的父表，不含指向自身的 ref 欄位。有 via 時只取該欄位
function parentRelations (table: TableKey, via?: string) {
  return relations.filter(relation => relation.childTable === table
    && relation.parentTable !== table
    && (!via || relation.column === via))
}

// TabPage 與 DashboardPage 的共用控制，統一登記一次（見 docs/topics/search.md 的「同一頁面中的多張表」）。cascade 開啟時篩選往下連動
export function provideSharedListControls (current?: Readonly<Ref<string>>, cascade: () => boolean = () => false): void {
  // TabPage 與 DashboardPage 不可互相嵌套，亦不可嵌套自身
  if (import.meta.env.DEV && inject(sharedListControlsKey, null)) {
    console.warn('TabPage 與 DashboardPage 不可互相嵌套，亦不可嵌套自身')
  }

  const query = ref('')
  const tables = shallowReactive(new Map<TableKey, SharedTable & { schema: TableSchema }>())
  // 共用的部分屬於容器，不隨第一個加入的列表卸載而停止
  const scope = effectScope()

  function join<Row> (table: TableKey, schema: TableSchema): SharedTable<Row> {
    let shared = tables.get(table)
    if (!shared) {
      shared = scope.run(() => {
        const sort = ref<SortSpec | null>(null)
        const { data, loading, error } = useSortedTableList<object>(table, schema, () => sort.value ? [sort.value] : null)
        return { schema, allRows: data, loading, error, filters: ref<Filters>({}), sort }
      })!
      tables.set(table, shared)
    }
    return shared as unknown as SharedTable<Row>
  }

  // 此表的列須通過的檢查：自己的條件與上層的條件。皆無時為 null
  function tableTest (table: TableKey, seen: ReadonlySet<TableKey>): RowTest | null {
    const shared = tables.get(table)
    const own = shared ? rowMatcher(shared.filters.value, shared.schema) : null
    const upper = upperFilter(table, undefined, seen)
    if (!own && !upper) {
      return null
    }
    return row => (!own || own(row)) && (!upper || upper(row))
  }

  // 同一張父表的多個 ref 欄位，任一父列符合即可。不同父表須同時符合。沒有父列的子列不符合
  function upperFilter (table: TableKey, via?: string, seen: ReadonlySet<TableKey> = new Set()): RowTest | null {
    if (!cascade() || seen.has(table)) {
      return null
    }
    const next = new Set(seen).add(table)
    const parents = new Map<TableKey, { test: RowTest, columns: string[] }>()
    for (const relation of parentRelations(table, via)) {
      const entry = parents.get(relation.parentTable)
      if (entry) {
        entry.columns.push(relation.column)
        continue
      }
      const test = tableTest(relation.parentTable, next)
      if (test) {
        parents.set(relation.parentTable, { test, columns: [relation.column] })
      }
    }
    if (parents.size === 0) {
      return null
    }
    const checks = [...parents.values()]
    return row => checks.every(({ test, columns }) => columns.some(column => {
      const parent = (row as Record<string, unknown>)[`$${column}`]
      return typeof parent === 'object' && parent !== null && test(parent)
    }))
  }

  // 條件往下影響此表的上層表，只列出此容器中有列表的表
  function filteredUppers (table: TableKey, seen: ReadonlySet<TableKey> = new Set()): TableKey[] {
    if (!cascade() || seen.has(table)) {
      return []
    }
    const next = new Set(seen).add(table)
    const result = new Set<TableKey>()
    for (const relation of parentRelations(table)) {
      const shared = tables.get(relation.parentTable)
      if (shared && hasActiveFilter(shared.filters.value)) {
        result.add(relation.parentTable)
      }
      for (const upper of filteredUppers(relation.parentTable, next)) {
        result.add(upper)
      }
    }
    return [...result]
  }

  provide(sharedListControlsKey, { query, join, upperFilter })

  // 容器中沒有列表時不登記，App Bar 不顯示搜尋按鈕
  registerSlot(listControlsKey, () => tables.size > 0
    ? {
        query,
        drawer: {
          tables: [...tables.entries()].map(([table, shared]) => ({
            schema: shared.schema,
            filters: shared.filters,
            rows: shared.allRows,
            sort: shared.sort,
            inheritedFrom: () => filteredUppers(table).map(upper => tables.get(upper)!.schema.tableLabel),
          })),
          current,
        },
      }
    : null, null)
}

// 不在 TabPage 或 DashboardPage 之內時為 null，列表自行登記
export function useSharedListControls (): SharedListControls | null {
  return inject(sharedListControlsKey, null)
}
