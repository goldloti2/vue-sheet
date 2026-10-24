import type { AnyColumn, SortSpec, TableSchema } from './types'
import { allColumns, durationSeconds, listedColumns } from './types'

// 排序：純函數。反應式的包裝位於 composables/data/useTable.ts

function isNil (value: unknown): value is null | undefined {
  return value === null || value === undefined
}

// null 與 undefined 一律排在最後，desc 只反轉有值者之間的比較
function compareWithDirection (a: unknown, b: unknown, direction: SortSpec['direction']): number {
  if (isNil(a) || isNil(b)) {
    return Number(isNil(a)) - Number(isNil(b))
  }
  const result = compareValues(a, b)
  return direction === 'desc' ? -result : result
}

// 兩邊皆有值時依型別比較：Date 比較時間，number 比較大小，其餘以字串比較，字串中的數字依數值
function compareValues (a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  // select：options 中的值（索引）排在 options 以外的值（原字串）之前
  if (typeof a === 'number' && typeof b === 'string') {
    return -1
  }
  if (typeof a === 'string' && typeof b === 'number') {
    return 1
  }
  // 時長為 "時:分:秒" 字串，以秒數比較，不依字典序
  const secondsA = durationSeconds(a)
  const secondsB = durationSeconds(b)
  if (secondsA !== null && secondsB !== null) {
    return secondsA - secondsB
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

// 排序用的值：ref 為父列的 $label，select 為 options 中的索引，options 以外的值排在其後並以字串比較
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
    return index === -1 ? String(value) : index
  }
  // boolean：否在前，是在後，空值在最後
  if (column?.type === 'boolean') {
    return typeof value === 'boolean' ? Number(value) : null
  }
  return value
}

// 列表頁排序：先依 sort（SortPanel），再依 schema.defaultSort。兩者皆無時維持原始順序（row number）
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
      const result = compareWithDirection(
        sortValue(rowA as Record<string, unknown>, column),
        sortValue(rowB as Record<string, unknown>, column),
        spec.direction,
      )
      if (result !== 0) {
        return result
      }
    }
    return 0
  })
}

// 排序面板的欄位與順序與 schema.sortable 相同，略過 image 欄位
export function sortableColumns (schema: TableSchema): AnyColumn[] {
  return listedColumns(schema, schema.sortable).filter(column => column.type !== 'image')
}

// 依單一鍵值排序（用於分組鍵）。number 以數字比較，其餘以字串比較，字串中的數字依數值
export function sortByKey<Row> (rows: readonly Row[], key: (row: Row) => string | number): Row[] {
  // eslint-disable-next-line unicorn/no-array-sort
  return [...rows].sort((rowA, rowB) => {
    const keyA = key(rowA)
    const keyB = key(rowB)
    if (typeof keyA === 'number' && typeof keyB === 'number') {
      return keyA - keyB
    }
    return String(keyA).localeCompare(String(keyB), undefined, { numeric: true })
  })
}
