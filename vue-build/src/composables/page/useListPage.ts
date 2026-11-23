import type { TableKey } from '@/schema'
import type { Filters } from '@/schema/filter'
import type { GroupLevel } from '@/schema/group'
import type { AnyTableSchema, RowOf, SortSpec } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { computed, ref, toValue } from 'vue'
import { useFilter } from '@/composables/data/useFilter'
import { useSearch } from '@/composables/data/useSearch'
import { useSortedTableList } from '@/composables/data/useTable'
import { useMultiSelect } from '@/composables/list/useMultiSelect'
import { provideListGrouping } from '@/composables/page/listGrouping'
import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'
import { useListControls } from '@/composables/shell/useListControls'
import { useSharedListControls } from '@/composables/shell/useSharedListControls'
import { schemas } from '@/schema'
import { compactMatch, matchesRow } from '@/schema/match'
import { sortRows } from '@/schema/sort'

export interface ListPageOptions<Row extends object> {
  // false：不自行登記，也不加入容器的共用控制，由頁面以 useListControls 登記（見 docs/topics/search.md）
  search?: boolean
  // 搭配 search: false 使用，每張表傳入同一個 query。省略時自行建立
  query?: Ref<string>
  // 只保留各欄等於指定值的列，並作為新增時的預設值。值為 undefined 的鍵略過。與 scope 同一步套用
  match?: () => Partial<Row>
  // 只保留符合的列，用於 match 寫不出的條件，於篩選與搜尋之前套用。函式讀取的 ref 改變時重算
  scope?: (row: Row) => boolean
  // 這些欄的篩選條件不套用至 rows，例如圖表的分組欄與系列欄（見 docs/topics/chart.md）
  ignoreFilter?: readonly string[]
  // 這個列表的預設排序，排在 schema.defaultSort 之前、排序面板的排序之後（見 docs/topics/search.md）
  defaultSort?: SortSpec<Row>[]
  // 由外到內的分組，由同一張表的 ListPage 套用。undefined 為不分組，使用者選了排序時也不分組
  levels?: MaybeRefOrGetter<readonly GroupLevel<Row>[] | undefined>
}

// 列表頁的資料層：整表 → match 與 scope（含 dashboard 面板的輸入）→ 頁面的排序 → 篩選 → 搜尋，以及多選（見 docs/components/page/ListPage.md）。Row 由表的 key 推出
export function useListPage<K extends TableKey> (table: K, options: ListPageOptions<RowOf<K>> = {}) {
  return listPage<RowOf<K>>(table, schemas[table], options)
}

function listPage<Row extends { id: string }> (
  table: TableKey,
  schema: AnyTableSchema,
  options: ListPageOptions<Row>,
) {
  const shared = options.search === false ? null : useSharedListControls()
  const { allRows, loading, error, filters, sort, query } = shared
    ? { ...shared.join<Row>(table, schema), query: shared.query }
    : ownControls<Row>(table, schema, options)

  // match、scope 與 dashboard 面板的輸入位於同一步
  const { scope } = options
  const match = () => compactMatch(options.match?.() ?? {}) as Partial<Row>
  const panel = useDashboardPanel()
  const scopedRows = computed(() => {
    const matched = match()
    const byMatch = Object.keys(matched).length > 0 ? (row: Row) => matchesRow(row, matched) : undefined
    const tests = [byMatch, scope, panel?.scope()]
      .filter(test => !!test)
    if (tests.length === 0) {
      return allRows.value
    }
    return allRows.value.filter(row => tests.every(test => test(row)))
  })

  // 頁面有 defaultSort 時，依「排序面板 → 頁面 → schema」重新排序。沒有時沿用整表的順序
  const pageSort = (options.defaultSort ?? []) as SortSpec[]
  const sortedRows = pageSort.length === 0
    ? scopedRows
    : computed(() => sortRows(scopedRows.value, schema, [...sort.value ? [sort.value] : [], ...pageSort]))

  const ignored = options.ignoreFilter ?? []
  const applied = () => ignored.length === 0
    ? filters.value
    : Object.fromEntries(Object.entries(filters.value).filter(([key]) => !ignored.includes(key)))
  const rows = useSearch(query, useFilter(applied, sortedRows, schema), schema)

  provideListGrouping<Row>(table, { levels: () => toValue(options.levels), sorted: () => sort.value !== null })

  return { rows, allRows, loading, error, query, filters, sort, match, selection: useMultiSelect() }
}

// 不在容器內時：自行建立排序、篩選與搜尋字串，並自行登記
function ownControls<Row extends { id: string }> (table: TableKey, schema: AnyTableSchema, options: ListPageOptions<Row>) {
  // 使用者選擇的單欄排序，null 表示 schema.defaultSort。defaultSort 一律作為次要排序
  const sort = ref<SortSpec | null>(null)
  const { data, loading, error } = useSortedTableList(table, () => sort.value ? [sort.value] : null)
  const allRows = data as unknown as ComputedRef<Row[]>

  const query = options.query ?? ref('')
  const filters = ref<Filters>({})
  if (options.search !== false) {
    useListControls(query, { tables: [{ table, filters, rows: allRows, sort }] })
  }

  return { allRows, loading, error, filters, sort, query }
}
