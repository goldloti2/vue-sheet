import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { useFilter } from '@/composables/data/useFilter'
import { useSearch } from '@/composables/data/useSearch'
import { useSortedTableList } from '@/composables/data/useTable'
import { useMultiSelect } from '@/composables/list/useMultiSelect'
import { useListControls } from '@/composables/shell/useListControls'
import { useSharedListControls } from '@/composables/shell/useSharedListControls'

export interface ListPageOptions<Row> {
  // 一頁接好幾張表時關掉，改由頁面自己 useListControls 一次登記全部（見 docs/ui.md）。
  // 傳 false 時完全由頁面手動處理：不自行登記，也不加入 TabView 等容器的共用控制
  search?: boolean
  // 同上，每張表傳同一條進來，搜尋才會同時作用在每張表上。不給就自己生一條
  query?: Ref<string>
  // 只留這些列，位於篩選與搜尋之前（例如頁籤的狀態）；函式中讀到的 ref 改變時重算
  scope?: (row: Row) => boolean
}

// 列表頁的資料層：整表 → scope → 篩選 → 搜尋，加上長按多選。
// rows 是畫面該顯示的那些；allRows 是沒過濾的整表（篩選抽屜的選項從它來）。
// 位於 TabView 或 DashboardPage 之內時，搜尋字串、篩選與排序取自容器共用的那份，不自行登記
export function useListPage<Row extends { id: string }> (
  table: TableKey,
  schema: TableSchema,
  options: ListPageOptions<Row> = {},
) {
  const shared = options.search === false ? null : useSharedListControls()
  const { allRows, loading, error, filters, sort, query } = shared
    ? { ...shared.join<Row>(table, schema), query: shared.query }
    : ownControls<Row>(table, schema, options)

  const { scope } = options
  const scopedRows = scope ? computed(() => allRows.value.filter(row => scope(row))) : allRows

  const rows = useSearch(query, useFilter(filters, scopedRows, schema), schema)

  return { rows, allRows, loading, error, query, filters, sort, selection: useMultiSelect() }
}

// 不在容器之內：自己一份排序、篩選與搜尋字串，並自行登記
function ownControls<Row extends { id: string }> (table: TableKey, schema: TableSchema, options: ListPageOptions<Row>) {
  // 使用者選的排序；null 就是 schema.defaultSort。單欄排序，defaultSort 永遠是 tiebreaker
  const sort = ref<SortSpec | null>(null)
  const { data: allRows, loading, error } = useSortedTableList<Row>(table, schema, () => sort.value ? [sort.value] : null)

  const query = options.query ?? ref('')
  const filters = ref<Filters>({})
  if (options.search !== false) {
    useListControls(query, { tables: [{ schema, filters, rows: allRows, sort }] })
  }

  return { allRows, loading, error, filters, sort, query }
}
