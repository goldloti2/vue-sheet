import type { TableSchema } from './types'

// useListPage 的 match：欄位 key → 值。值為 undefined 的鍵不篩選，也不作為預設值（見 docs/components/page/ListPage.md）

export function compactMatch (match: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(match).filter(([, value]) => value !== undefined))
}

// 每個鍵皆須相等。比較為嚴格相等，日期比較時間值
export function matchesRow (row: object, match: Record<string, unknown>): boolean {
  const record = row as Record<string, unknown>
  return Object.entries(match).every(([key, expected]) => {
    const actual = record[key]
    return expected instanceof Date && actual instanceof Date
      ? expected.getTime() === actual.getTime()
      : actual === expected
  })
}

// 新增時的預設值：只取真實欄位，虛擬欄位略過
export function matchDefaults (schema: TableSchema, match: Record<string, unknown>): Record<string, unknown> {
  const keys = new Set(schema.columns.map(column => column.key))
  return Object.fromEntries(Object.entries(match).filter(([key]) => keys.has(key)))
}
