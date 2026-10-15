import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { effectScope, inject, provide, ref, shallowReactive } from 'vue'
import { useSortedTableList } from '@/composables/data/useTable'
import { registerSlot } from '@/composables/shell/useActionSlot'
import { listControlsKey } from '@/composables/shell/useListControls'

// 同一張表的列表共用的部分：依共用的排序排好的整表、篩選條件與排序
export interface SharedTable<Row = object> {
  allRows: ComputedRef<Row[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  filters: Ref<Filters>
  sort: Ref<SortSpec | null>
}

export interface SharedListControls {
  query: Ref<string>
  // 取得這張表共用的部分，第一個加入的列表負責建立
  join: <Row>(table: TableKey, schema: TableSchema) => SharedTable<Row>
}

const sharedListControlsKey: InjectionKey<SharedListControls> = Symbol('sharedListControls')

// TabView 與 DashboardPage 用：底下的列表共用一條搜尋字串，同一張表共用篩選與排序，由此統一登記一次（見 docs/dashboard.md）。
// current 為抽屜打開時先停的表（tableLabel），對不上任何表時停在第一張
export function provideSharedListControls (current?: Ref<string>): void {
  // TabView 與 DashboardPage 不可互相嵌套，亦不可嵌套自身：列表只會加入最近的容器，兩層又各自登記 App Bar
  if (import.meta.env.DEV && inject(sharedListControlsKey, null)) {
    console.warn('TabView 與 DashboardPage 不可互相嵌套，亦不可嵌套自身')
  }

  const query = ref('')
  const tables = shallowReactive(new Map<TableKey, SharedTable & { schema: TableSchema }>())
  // 共用的部分歸容器所有，不隨最先加入的那個列表卸載而停止
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

  provide(sharedListControlsKey, { query, join })

  // 底下沒有列表時不登記，App Bar 不出現放大鏡
  registerSlot(listControlsKey, () => tables.size > 0
    ? {
        query,
        drawer: {
          tables: [...tables.values()].map(shared => ({ schema: shared.schema, filters: shared.filters, rows: shared.allRows, sort: shared.sort })),
          current,
        },
      }
    : null, null)
}

// 不在 TabView 或 DashboardPage 之內時為 null，列表照常自行登記
export function useSharedListControls (): SharedListControls | null {
  return inject(sharedListControlsKey, null)
}
