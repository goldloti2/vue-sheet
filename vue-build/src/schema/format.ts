import type { AnyColumn, FormatColor, TableSchema } from './types'
import { formatColumnValue } from './types'

// 條件式格式：純函數，算出一欄顯示的文字與套用的格式。畫的部分在 components/ui/view/FormattedValue.vue

export interface FieldFormat {
  color?: FormatColor
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  icons: { icon: string, color?: FormatColor }[]
}

// 顯示用的值：文字與格式一起傳，沒有符合的規則時 format 為 undefined
export interface DisplayValue {
  text: string
  format?: FieldFormat
}

// 符合的規則依宣告順序合併：顏色取第一個、圖示依序全取、其餘樣式任一條有即有。值為空時完全空白，不套格式
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
