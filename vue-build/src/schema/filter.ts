import type { AnyColumn, TableSchema } from './types'
import { durationSeconds, listedColumns } from './types'
import { isEmpty } from './validation'

// 篩選：條件的形狀與純函數。反應式的包裝位於 composables/data/useFilter.ts

type Bound = number | Date | string

// 一欄的篩選條件：select 與 boolean 使用 values（null 為「空白」選項），其餘使用 min、max。空的條件不篩選
export interface ColumnFilter {
  values?: (string | null)[]
  // 包含兩端。number 為數字，date 為 Date，duration 為 "時:分:秒" 字串
  min?: Bound | null
  max?: Bound | null
  // 圖表寫入的區間：≥ min 且 < below，沒有 below 時不設上限。抽屜的輸入框不顯示此區間
  segment?: { min: Bound, below?: Bound }
}

// 欄位 key → 條件。未列出的欄位不篩選
export type Filters = Record<string, ColumnFilter>

// schema.searchable 中的 text 與 ref 由搜尋列比對，其餘型別由篩選抽屜處理
function isFilterable (column: AnyColumn): boolean {
  return ['boolean', 'date', 'duration', 'number', 'select'].includes(column.type)
}

// boolean 的選項固定為是、否，依此順序列在篩選抽屜
const BOOLEAN_OPTIONS = ['true', 'false']

// 抽屜第一層的欄位與順序：schema.searchable 中由篩選抽屜處理的欄位
export function filterableColumns (schema: TableSchema): AnyColumn[] {
  return listedColumns(schema, schema.searchable).filter(column => isFilterable(column))
}

interface PresentValues {
  // options 中出現於資料的值，依 options 的順序
  known: string[]
  // 資料中有而 options 沒有的值（例如 allowCustom 的輸入），出現次數多者在前，次數相同時依字串
  extra: string[]
  hasBlank: boolean
}

// select 或 boolean 欄位於 rows 中實際出現的值，供篩選抽屜的選項使用
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

  const options = column.type === 'select' ? column.options : (column.type === 'boolean' ? BOOLEAN_OPTIONS : [])
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
  return (filter.values?.length ?? 0) > 0 || filter.min != null || filter.max != null || filter.segment !== undefined
}

// 任一欄有條件即為篩選中（用於 App Bar 的圖示標記）
export function hasActiveFilter (filters: Filters): boolean {
  return Object.values(filters).some(filter => isActiveFilter(filter))
}

// select 的比對鍵：空值（與 coerceRow 相同，含空字串）為 null，其餘轉為字串
function selectKey (value: unknown): string | null {
  return isEmpty(value) ? null : String(value)
}

// 範圍比較一律換算為數字：Date 為毫秒，時長為秒
function toNumber (value: unknown): number | null {
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === 'string') {
    return durationSeconds(value)
  }
  return typeof value === 'number' ? value : null
}

// 值為空的列：select 只在勾選「空白」時保留，範圍條件一律不保留
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
  if ((min !== null && actual < min) || (max !== null && actual > max)) {
    return false
  }
  if (filter.segment) {
    const below = toNumber(filter.segment.below)
    return actual >= (toNumber(filter.segment.min) ?? -Infinity) && (below === null || actual < below)
  }
  return true
}

// 檢查一列是否符合整張表條件的函數。欄位之間為 AND，只檢查 filterable 的欄位。沒有生效的條件時為 null
export function rowMatcher (filters: Filters, schema: TableSchema): ((row: object) => boolean) | null {
  const active = filterableColumns(schema)
    .map(column => ({ key: column.key, filter: filters[column.key] }))
    .filter((entry): entry is { key: string, filter: ColumnFilter } => isActiveFilter(entry.filter))
  if (active.length === 0) {
    return null
  }
  return row => active.every(({ key, filter }) => matchesFilter((row as Record<string, unknown>)[key], filter))
}
