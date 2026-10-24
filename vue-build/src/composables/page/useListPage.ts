import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { useFilter } from '@/composables/data/useFilter'
import { useSearch } from '@/composables/data/useSearch'
import { useSortedTableList } from '@/composables/data/useTable'
import { useMultiSelect } from '@/composables/list/useMultiSelect'
import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'
import { useListControls } from '@/composables/shell/useListControls'
import { useSharedListControls } from '@/composables/shell/useSharedListControls'

export interface ListPageOptions<Row> {
  // false：不自行登記，也不加入容器的共用控制，由頁面以 useListControls 登記（見 docs/topics/search.md）
  search?: boolean
  // 搭配 search: false 使用，每張表傳入同一個 query。省略時自行建立
  query?: Ref<string>
  // 只保留符合的列（例如頁籤的狀態），於篩選與搜尋之前套用。函式讀取的 ref 改變時重算
  scope?: (row: Row) => boolean
}

// 列表頁的資料層：整表 → scope（含 dashboard 的互動）→ 篩選 → 搜尋，以及多選（見 docs/components/page/ListPage.md）
export function useListPage<Row extends { id: string }> (
  table: TableKey,
  schema: TableSchema,
  options: ListPageOptions<Row> = {},
) {
  const shared = options.search === false ? null : useSharedListControls()
  const { allRows, loading, error, filters, sort, query } = shared
    ? { ...shared.join<Row>(table, schema), query: shared.query }
    : ownControls<Row>(table, schema, options)

  // dashboard 的互動：子表只留所選父列的子列，與 scope 位於同一步
  const { scope } = options
  const dashboard = useDashboardSelection()
  const scopedRows = computed(() => {
    const parentScope = dashboard?.parentScope(table) ?? null
    if (!scope && !parentScope) {
      return allRows.value
    }
    return allRows.value.filter(row => (!scope || scope(row)) && (!parentScope || parentScope(row)))
  })

  const rows = useSearch(query, useFilter(filters, scopedRows, schema), schema)

  return { rows, allRows, loading, error, query, filters, sort, selection: useMultiSelect() }
}

// 不在容器內時：自行建立排序、篩選與搜尋字串，並自行登記
function ownControls<Row extends { id: string }> (table: TableKey, schema: TableSchema, options: ListPageOptions<Row>) {
  // 使用者選擇的單欄排序，null 表示 schema.defaultSort。defaultSort 一律作為次要排序
  const sort = ref<SortSpec | null>(null)
  const { data: allRows, loading, error } = useSortedTableList<Row>(table, schema, () => sort.value ? [sort.value] : null)

  const query = options.query ?? ref('')
  const filters = ref<Filters>({})
  if (options.search !== false) {
    useListControls(query, { tables: [{ schema, filters, rows: allRows, sort }] })
  }

  return { allRows, loading, error, filters, sort, query }
}
