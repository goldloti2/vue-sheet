import type { AnyColumn, TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { allColumns } from '@/schema/types'
import { isEmpty } from '@/schema/validation'

// 一欄的篩選條件：select 用 values（null 代表「空白」那個選項），number / date 用 min / max。空的就是不篩
export interface ColumnFilter {
  values?: (string | null)[]
  min?: number | Date | null
  max?: number | Date | null
}

// 欄位 key → 條件；沒列的欄位不篩
export type Filters = Record<string, ColumnFilter>

// 搜尋列比 text / ref，其他開了 searchable 的型別歸篩選
export function isFilterable (column: AnyColumn): boolean {
  return column.searchable === true && ['select', 'number', 'date'].includes(column.type)
}

// 抽屜裡的順序跟 detail 頁一樣（detailOrder）；沒排進 detailOrder 的接在後面，不像 detail 那樣藏起來
export function filterableColumns (schema: TableSchema): AnyColumn[] {
  const columns = allColumns(schema).filter(column => isFilterable(column))
  const order = schema.detailOrder ?? []
  const rank = (column: AnyColumn) => {
    const index = order.indexOf(column.key)
    return index === -1 ? order.length : index
  }
  // eslint-disable-next-line unicorn/no-array-sort
  return [...columns].sort((a, b) => rank(a) - rank(b))
}

function isActive (filter: ColumnFilter | undefined): boolean {
  if (!filter) {
    return false
  }
  return (filter.values?.length ?? 0) > 0 || filter.min != null || filter.max != null
}

// 有任何一欄設了條件就算篩選中（App Bar 的圖示標記用）
export function hasActiveFilter (filters: Filters): boolean {
  return Object.values(filters).some(filter => isActive(filter))
}

// select 的比對鍵：空值（跟 coerceRow 一樣把空字串當空）是 null，其餘轉字串
export function selectKey (value: unknown): string | null {
  return isEmpty(value) ? null : String(value)
}

function toNumber (value: unknown): number | null {
  if (value instanceof Date) {
    return value.getTime()
  }
  return typeof value === 'number' ? value : null
}

// 值空著的列：select 只有勾了「空白」才留，範圍條件一律不留（沒東西可比）
function matches (value: unknown, filter: ColumnFilter): boolean {
  if (filter.values && filter.values.length > 0) {
    const key = selectKey(value)
    return filter.values.includes(key)
  }

  const actual = toNumber(value)
  if (actual === null) {
    return false
  }
  const min = toNumber(filter.min)
  const max = toNumber(filter.max)
  return (min === null || actual >= min) && (max === null || actual <= max)
}

// 欄位之間 AND、同一欄的 values 之間 OR。只看 filterable 的欄位，別的 key 忽略
export function useFilter<Row extends object> (
  filters: MaybeRefOrGetter<Filters>,
  rows: MaybeRefOrGetter<readonly Row[]>,
  schema: TableSchema,
): ComputedRef<Row[]> {
  const columns = filterableColumns(schema)

  return computed(() => {
    const current = toValue(filters)
    const active = columns
      .map(column => ({ key: column.key, filter: current[column.key] }))
      .filter((entry): entry is { key: string, filter: ColumnFilter } => isActive(entry.filter))

    const list = toValue(rows)
    if (active.length === 0) {
      return [...list]
    }

    return list.filter(row => active.every(({ key, filter }) => matches((row as Record<string, unknown>)[key], filter)))
  })
}
