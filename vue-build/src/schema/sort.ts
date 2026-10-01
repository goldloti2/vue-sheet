import type { AnyColumn, SortSpec, TableSchema } from './types'
import { allColumns, durationSeconds, listedColumns } from './types'

// 排序：純函數，對一批 row 做事。反應式的包裝在 composables/data/useTable.ts

// null/undefined 一律排最後（不管 asc/desc），其餘依實際型別比較（Date 比時間、number 比大小、其餘當字串比較）
function compareValues (a: unknown, b: unknown): number {
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1
  }
  if (b === null || b === undefined) {
    return -1
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  // 時長是 "時:分:秒" 字串，照字典序會把 "9:30:00" 排到 "10:00:00" 後面
  const secondsA = durationSeconds(a)
  const secondsB = durationSeconds(b)
  if (secondsA !== null && secondsB !== null) {
    return secondsA - secondsB
  }
  return String(a).localeCompare(String(b))
}

// 排序用的值：ref 照對方的 $label（值本身是 id，照 id 排沒意義）、
// select 照 options 的宣告順序（狀態有先後，照字典序排不對），options 沒有的值一律排在最後、彼此靠下一個 spec 分先後
function sortValue (row: Record<string, unknown>, column: AnyColumn | undefined): unknown {
  const value = row[column?.key ?? '']
  if (column?.type === 'ref') {
    return (row[`$${column.key}`] as { $label?: string } | undefined)?.$label ?? null
  }
  if (column?.type === 'select') {
    if (value == null || value === '') {
      return null
    }
    const index = column.options.indexOf(String(value))
    return index === -1 ? column.options.length : index
  }
  return value
}

// 列表頁排序：sort 是使用者選的（`SortPanel`），schema.defaultSort 永遠接在後面當 tiebreaker。
// 兩個都沒有就回傳原始順序（row number）
export function sortRows<Row> (rows: readonly Row[], schema: TableSchema, sort?: SortSpec[] | null): Row[] {
  const sortSpecs = [...sort ?? [], ...schema.defaultSort ?? []]
  if (sortSpecs.length === 0) {
    return [...rows]
  }

  const columns = new Map(allColumns(schema).map(column => [column.key, column]))

  // eslint-disable-next-line unicorn/no-array-sort
  return [...rows].sort((rowA, rowB) => {
    for (const spec of sortSpecs) {
      const column = columns.get(spec.key)
      const result = compareValues(
        sortValue(rowA as Record<string, unknown>, column),
        sortValue(rowB as Record<string, unknown>, column),
      )
      if (result !== 0) {
        return spec.direction === 'desc' ? -result : result
      }
    }
    return 0
  })
}

// 排序面板的欄位與順序：schema.sortable 怎麼寫就怎麼排。image 沒有合理的比較方式，列了也跳過
export function sortableColumns (schema: TableSchema): AnyColumn[] {
  return listedColumns(schema, schema.sortable).filter(column => column.type !== 'image')
}

// 依單一鍵值排序，鍵值是 number 就數字比較，否則當字串比較（用於分組鍵，不吃 schema）
export function sortByKey<Row> (rows: readonly Row[], key: (row: Row) => string | number): Row[] {
  // eslint-disable-next-line unicorn/no-array-sort
  return [...rows].sort((rowA, rowB) => {
    const keyA = key(rowA)
    const keyB = key(rowB)
    if (typeof keyA === 'number' && typeof keyB === 'number') {
      return keyA - keyB
    }
    return String(keyA).localeCompare(String(keyB))
  })
}
