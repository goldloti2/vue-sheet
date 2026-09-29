import type { Filters } from '@/composables/data/useFilter'
import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import { ref } from 'vue'
import { useFilter } from '@/composables/data/useFilter'
import { useSearch } from '@/composables/data/useSearch'
import { useSortedTableList } from '@/composables/data/useTable'
import { useMultiSelect } from '@/composables/list/useMultiSelect'
import { useAppBarSearch } from '@/composables/shell/useAppBarSearch'

export interface ListPageOptions {
  // 一頁接好幾張表時關掉，改由頁面自己 useAppBarSearch 一次登記全部（見 docs/ui.md）
  search?: boolean
}

// 列表頁的資料層：整表 → 篩選 → 搜尋，加上長按多選。
// rows 是畫面該顯示的那些；allRows 是沒過濾的整表（篩選抽屜的選項從它來）
export function useListPage<Row extends { id: string }> (
  table: TableKey,
  schema: TableSchema,
  options: ListPageOptions = {},
) {
  const { data: allRows, loading, error } = useSortedTableList<Row>(table, schema)

  const query = ref('')
  const filters = ref<Filters>({})
  if (options.search !== false) {
    useAppBarSearch(query, { tables: [{ schema, filters, rows: allRows }] })
  }

  const rows = useSearch(query, useFilter(filters, allRows, schema), schema)

  return { rows, allRows, loading, error, query, filters, selection: useMultiSelect() }
}
