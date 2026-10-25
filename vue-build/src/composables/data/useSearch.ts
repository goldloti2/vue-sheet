import type { AnyColumn, TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { formatColumnValue, listedColumns } from '@/schema/types'

// 搜尋列只比對 schema.searchable 中的 text 與 ref 欄位，ref 比對父列的名稱。其餘型別由篩選抽屜處理
function isSearchable (column: AnyColumn): boolean {
  return column.type === 'text' || column.type === 'ref'
}

// 一列的可搜尋文字：串接所有可搜尋欄位的顯示文字，並轉為小寫
function searchText (row: object, columns: readonly AnyColumn[]): string {
  return columns.map(column => formatColumnValue(row, column)).join(' ').toLowerCase()
}

// 依空白切詞，雙引號內的文字為一個詞。引號未閉合時，其後的整段為一個詞
function searchTerms (query: string): string[] {
  const terms: string[] = []
  const pattern = /"([^"]*)"?|(\S+)/g

  for (const match of query.toLowerCase().matchAll(pattern)) {
    const term = (match[1] ?? match[2]).trim()
    if (term) {
      terms.push(term)
    }
  }

  return terms
}

// 每個詞皆須出現（AND），順序不限。query 為空或沒有可搜尋欄位時回傳全部的列
export function useSearch<Row extends object> (
  query: MaybeRefOrGetter<string>,
  rows: MaybeRefOrGetter<readonly Row[]>,
  schema: TableSchema,
): ComputedRef<Row[]> {
  const columns = listedColumns(schema, schema.searchable).filter(column => isSearchable(column))

  // 可搜尋文字只隨 rows 重算，輸入時只執行 includes
  const indexed = computed(() => toValue(rows).map(row => ({ row, text: searchText(row, columns) })))
  const terms = computed(() => searchTerms(toValue(query)))

  return computed(() => {
    const currentTerms = terms.value
    if (currentTerms.length === 0 || columns.length === 0) {
      return indexed.value.map(entry => entry.row)
    }

    return indexed.value
      .filter(entry => currentTerms.every(term => entry.text.includes(term)))
      .map(entry => entry.row)
  })
}
