import type { AnyColumn, TableSchema } from './types'
import { durationSeconds, listedColumns } from './types'
import { isEmpty } from './validation'

// 篩選：條件的形狀與純函數。反應式的包裝在 composables/data/useFilter.ts

// 一欄的篩選條件：select 用 values（null 代表「空白」那個選項），number / date 用 min / max。空的就是不篩
export interface ColumnFilter {
  values?: (string | null)[]
  // number 是數字、date 是 Date、duration 是 "時:分:秒" 字串
  min?: number | Date | string | null
  max?: number | Date | string | null
}

// 欄位 key → 條件；沒列的欄位不篩
export type Filters = Record<string, ColumnFilter>

// schema.searchable 裡的欄位，搜尋列比 text / ref，其餘型別歸篩選抽屜
export function isFilterable (column: AnyColumn): boolean {
  return ['date', 'duration', 'number', 'select'].includes(column.type)
}

// 抽屜第一層的欄位與順序：schema.searchable ，跳過歸搜尋列的那些
export function filterableColumns (schema: TableSchema): AnyColumn[] {
  return listedColumns(schema, schema.searchable).filter(column => isFilterable(column))
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

export function isActiveFilter (filter: ColumnFilter | undefined): boolean {
  if (!filter) {
    return false
  }
  return (filter.values?.length ?? 0) > 0 || filter.min != null || filter.max != null
}

// 有任何一欄設了條件就算篩選中（App Bar 的圖示標記用）
export function hasActiveFilter (filters: Filters): boolean {
  return Object.values(filters).some(filter => isActiveFilter(filter))
}

// select 的比對鍵：空值（跟 coerceRow 一樣把空字串當空）是 null，其餘轉字串
export function selectKey (value: unknown): string | null {
  return isEmpty(value) ? null : String(value)
}

// 範圍比較一律換算成數字：Date 用毫秒、時長用秒
function toNumber (value: unknown): number | null {
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === 'string') {
    return durationSeconds(value)
  }
  return typeof value === 'number' ? value : null
}

// 值空著的列：select 只有勾了「空白」才留，範圍條件一律不留（沒東西可比）
export function matchesFilter (value: unknown, filter: ColumnFilter): boolean {
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
