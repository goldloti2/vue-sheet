import type { TableKey } from './index'
import type { RowKey, RowOf } from './types'
import { schemas } from './index'
import { findColumn } from './types'

// select 欄位的選項，順序即宣告的順序。真實欄位與虛擬欄位皆可。不是 select 時為空陣列，開發模式下以 console 警告
export function optionsOf<K extends TableKey> (table: K, key: RowKey<RowOf<K>>): string[] {
  const schema = schemas[table]
  const column = findColumn(schema, key as string)
  if (column?.type === 'select') {
    return column.options
  }
  if (import.meta.env.DEV) {
    console.warn(`optionsOf（${schema.tableLabel}）：${column ? `${column.label}（${column.type}）不是 select` : `找不到欄位 ${String(key)}`}`)
  }
  return []
}
