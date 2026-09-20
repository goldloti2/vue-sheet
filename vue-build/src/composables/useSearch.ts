import type { AnyColumn, TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { allColumns, formatColumnValue } from '@/schema/types'

// 搜尋列比對的是這兩種：text 是本文、ref 是父表的名字。其他型別開了 searchable 走篩選
function isSearchable (column: AnyColumn): boolean {
  return column.searchable === true && (column.type === 'text' || column.type === 'ref')
}

// 一列的可搜尋文字：所有 searchable 欄位的顯示文字接起來（日期／ref 都是顯示的樣子），統一小寫
function searchText (row: object, columns: readonly AnyColumn[]): string {
  return columns.map(column => formatColumnValue(row, column)).join(' ').toLowerCase()
}

// 依空白切詞，雙引號包起來的當一個詞；引號沒閉合就把剩下的整段當一個詞
export function searchTerms (query: string): string[] {
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

// 每個詞都要出現（AND），順序不限。query 空白就是全部
export function useSearch<Row extends object> (
  query: MaybeRefOrGetter<string>,
  rows: MaybeRefOrGetter<readonly Row[]>,
  schema: TableSchema,
): ComputedRef<Row[]> {
  const columns = allColumns(schema).filter(column => isSearchable(column))

  // 文字只跟 rows 一起重算，敲字時只做 includes
  const indexed = computed(() => toValue(rows).map(row => ({ row, text: searchText(row, columns) })))
  const terms = computed(() => searchTerms(toValue(query)))

  return computed(() => {
    const currentTerms = terms.value
    if (currentTerms.length === 0) {
      return indexed.value.map(entry => entry.row)
    }

    return indexed.value
      .filter(entry => currentTerms.every(term => entry.text.includes(term)))
      .map(entry => entry.row)
  })
}
