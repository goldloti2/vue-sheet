import type { ListControls } from '@/composables/shell/useListControls'
import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { computed, effectScope, inject, provide, ref, shallowReactive } from 'vue'
import { useSortedTableList } from '@/composables/data/useTable'

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
}

const sharedListControlsKey: InjectionKey<SharedListControls> = Symbol('sharedListControls')

// TabPage、DashboardPage 與 DashboardPanel 的共用控制（見 docs/topics/search.md 的「同一頁面中的多張表」）。回傳交給 App Bar 的值，由容器登記
export function provideSharedListControls (current?: Readonly<Ref<string>>): ComputedRef<ListControls | null> {
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

  provide(sharedListControlsKey, { query, join })

  // 容器中沒有列表時為 null，App Bar 不顯示搜尋按鈕。表沒有增減時為同一個物件
  return computed(() => tables.size > 0
    ? {
        query,
        drawer: {
          tables: [...tables.values()].map(shared => ({
            schema: shared.schema,
            filters: shared.filters,
            rows: shared.allRows,
            sort: shared.sort,
          })),
          current,
        },
      }
    : null)
}

// 不在 TabPage、DashboardPage 或 DashboardPanel 之內時為 null，列表自行登記
export function useSharedListControls (): SharedListControls | null {
  return inject(sharedListControlsKey, null)
}
