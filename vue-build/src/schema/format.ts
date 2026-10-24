import type { AnyColumn, FormatColor, TableSchema } from './types'
import { formatColumnValue } from './types'

// 條件式格式：純函數，計算一欄顯示的文字與套用的格式。顯示由 components/ui/view/FormattedValue.vue 處理

export interface FieldFormat {
  color?: FormatColor
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  icons: { icon: string, color?: FormatColor }[]
}

// 顯示用的值，包含文字與格式。沒有符合的規則時 format 為 undefined
export interface DisplayValue {
  text: string
  format?: FieldFormat
}

// 符合的規則依宣告順序合併（見 docs/topics/schema.md）。值為空時不套用格式
export function displayValue (row: object, schema: TableSchema, column: AnyColumn): DisplayValue {
  const text = formatColumnValue(row, column)
  if (text === '') {
    return { text }
  }

  const rules = (schema.formatRules ?? [])
    .filter(rule => (rule.columns as readonly string[]).includes(column.key) && rule.when(row))
  if (rules.length === 0) {
    return { text }
  }

  return {
    text,
    format: {
      color: rules.find(rule => rule.color)?.color,
      bold: rules.some(rule => rule.bold),
      italic: rules.some(rule => rule.italic),
      underline: rules.some(rule => rule.underline),
      strike: rules.some(rule => rule.strike),
      icons: rules.flatMap(rule => rule.icon ? [{ icon: rule.icon, color: rule.iconColor }] : []),
    },
  }
}
