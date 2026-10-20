import type { SchemaColumn, TableSchema } from './types'

// 空值的定義跟 coerceRow 一致：後端的空字串會被轉成 null
const EMPTY_VALUES = new Set<unknown>([null, undefined, ''])

export function isEmpty (value: unknown): boolean {
  return EMPTY_VALUES.has(value)
}

function columnError (value: unknown, column: SchemaColumn, row: object): string | null {
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

  if (column.type === 'duration' && !/^\d+:[0-5]\d:[0-5]\d$/.test(String(value))) {
    return `${column.label}要是「時:分:秒」的長度，例如 1:30:00`
  }

  if (column.type === 'select' && !column.allowCustom && !column.options.includes(String(value))) {
    return `${column.label}不是有效的選項`
  }

  // 內建檢查都過了才輪到設計者的規則。
  const validate = column.validate as ((value: unknown, row: object) => string | null) | undefined
  return validate ? validate(value, row) : null
}

// 主鍵：有 newId 時可留空（新增時發號），否則必填；格式見 docs/topics/schema.md 的「主鍵」
function idError (value: unknown, column: SchemaColumn, schema: TableSchema): string | null {
  if (isEmpty(value)) {
    return schema.newId ? null : `請填寫${column.label}`
  }

  const text = String(value)
  if (/^[\d=+\-']/.test(text)) {
    return `${column.label}不能以數字或 =、+、-、' 開頭`
  }
  if (encodeURIComponent(text) !== text) {
    return `${column.label}只能使用英文字母、數字與 - _ . ! ~ * ' ( )`
  }
  if (text === '.' || text === '..') {
    return `${column.label}不能是 . 或 ..`
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

    const value = (row as Record<string, unknown>)[column.key]
    const message = (column.key === schema.idColumn ? idError(value, column, schema) : null)
      ?? columnError(value, column, row)
    if (message !== null) {
      errors[column.key] = message
    }
  }

  return errors
}
