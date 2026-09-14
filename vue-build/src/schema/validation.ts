import type { SchemaColumn, TableSchema } from './types'

// 空值的定義跟 coerceRow 一致：後端的空字串會被轉成 null
const EMPTY_VALUES = new Set<unknown>([null, undefined, ''])

export function isEmpty (value: unknown): boolean {
  return EMPTY_VALUES.has(value)
}

function columnError (value: unknown, column: SchemaColumn): string | null {
  if (isEmpty(value)) {
    return column.required ? `請填寫${column.label}` : null
  }

  if (column.type === 'number' && typeof value === 'number') {
    if (column.min !== undefined && value < column.min) {
      return `${column.label}不能小於 ${column.min}`
    }
    if (column.max !== undefined && value > column.max) {
      return `${column.label}不能大於 ${column.max}`
    }
  }

  if (column.type === 'select' && !column.options.includes(String(value))) {
    return `${column.label}不是有效的選項`
  }

  return null
}

// 回傳 { 欄位 key: 錯誤訊息 }，全部合法就是空物件。給了 keys 就只檢查那幾欄
export function validateRow (row: object, schema: TableSchema, keys?: readonly string[]): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const column of schema.columns) {
    if (keys && !keys.includes(column.key)) {
      continue
    }

    const message = columnError((row as Record<string, unknown>)[column.key], column)
    if (message !== null) {
      errors[column.key] = message
    }
  }

  return errors
}
