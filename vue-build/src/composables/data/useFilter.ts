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

export interface PresentValues {
  // options 裡在資料出現過的，照 options 順序
  known: string[]
  // 資料裡有、options 沒有的（allowCustom 打的、Sheet 手動改的），出現次數多的在前，同次數依字串
  extra: string[]
  hasBlank: boolean
}

// 一個 select 欄位在 rows 裡實際出現過哪些值。篩選抽屜的選項與 suggestFromData 的建議清單都從這裡拿，排法才一致
export function presentValues (rows: readonly object[], column: AnyColumn): PresentValues {
  const counts = new Map<string, number>()
  let hasBlank = false
  for (const row of rows) {
    const key = selectKey((row as Record<string, unknown>)[column.key])
    if (key === null) {
      hasBlank = true
    } else {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const options = column.type === 'select' ? column.options : []
  const known = options.filter(option => counts.has(option))
  // eslint-disable-next-line unicorn/no-array-sort
  const extra = [...counts.keys()].filter(value => !options.includes(value)).sort((a, b) => {
    const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return byCount === 0 ? a.localeCompare(b) : byCount
  })
  return { known, extra, hasBlank }
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
