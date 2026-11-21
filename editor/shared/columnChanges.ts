// 兩個版本的 schema 之間欄位的修改：新增、刪除、key 的改名、表頭與型別的修改、主鍵的更換
import type { SchemaModel } from './schema.ts'
import type { ColumnList, ColumnRow } from './schemaForm.ts'
import { propertyValue, stringValue } from './schema.ts'
import { columnRows } from './schemaForm.ts'

interface ColumnSnapshot {
  list: ColumnList
  index: number
  key: string
  /** Sheet 的表頭。虛擬欄位為 null。不是以字串直接寫值時為原文 */
  header: string | null
  type: string | null
}

function headerOf (row: ColumnRow, text: string): string | null {
  if (row.list === 'virtualColumns') {
    return null
  }
  const value = propertyValue(row.object, 'sheetHeader') ?? propertyValue(row.object, 'label')
  return stringValue(value) ?? (value ? text.slice(value.from, value.to) : null)
}

function snapshots (model: SchemaModel, text: string): ColumnSnapshot[] {
  return columnRows(model).flatMap(row => row.key === null
    ? []
    : [{ list: row.list, index: row.index, key: row.key, header: headerOf(row, text), type: stringValue(propertyValue(row.object, 'type')) }])
}

// 同一欄位的表頭與型別的修改
function detailChanges (before: ColumnSnapshot, after: ColumnSnapshot): string[] {
  const changes: string[] = []
  if (before.header !== after.header && after.header !== null && before.header !== null) {
    changes.push(`欄位 ${after.key} 的表頭由「${before.header}」改為「${after.header}」`)
  }
  if (before.type !== after.type) {
    changes.push(`欄位 ${after.key} 的型別由 ${before.type ?? '（程式碼）'} 改為 ${after.type ?? '（程式碼）'}`)
  }
  return changes
}

/** 欄位的修改，一項一句。兩邊皆以 key 對應，只在一邊的欄位位於同一個位置時視為 key 的改名 */
export function columnChanges (before: SchemaModel, beforeText: string, after: SchemaModel, afterText: string): string[] {
  const oldColumns = snapshots(before, beforeText)
  const newColumns = snapshots(after, afterText)
  const oldKeys = new Set(oldColumns.map(column => column.key))
  const newKeys = new Set(newColumns.map(column => column.key))
  const removed = oldColumns.filter(column => !newKeys.has(column.key))
  const added = newColumns.filter(column => !oldKeys.has(column.key))

  // 依序列出改名、新增、刪除，再列出表頭與型別
  const renames: string[] = []
  const additions: string[] = []
  const details: string[] = []
  const renamed = new Set<ColumnSnapshot>()
  const newKeyOf = new Map<string, string>()
  for (const column of added) {
    const old = removed.find(candidate => candidate.list === column.list && candidate.index === column.index && !renamed.has(candidate))
    if (old) {
      renamed.add(old)
      newKeyOf.set(old.key, column.key)
      renames.push(`欄位 ${old.key} 改為 ${column.key}`)
      details.push(...detailChanges(old, column))
    } else {
      additions.push(`新增欄位 ${column.key}`)
    }
  }
  for (const column of newColumns) {
    const old = oldColumns.find(candidate => candidate.key === column.key)
    if (old) {
      details.push(...detailChanges(old, column))
    }
  }
  const removals = removed.filter(column => !renamed.has(column)).map(column => `刪除欄位 ${column.key}`)
  // 主鍵的欄位改名時，不另列主鍵的更換
  const oldId = stringValue(propertyValue(before.schema, 'idColumn'))
  const newId = stringValue(propertyValue(after.schema, 'idColumn'))
  const idChanges = oldId !== null && newId !== null && oldId !== newId && newKeyOf.get(oldId) !== newId
    ? [`主鍵由 ${oldId} 改為 ${newId}`]
    : []
  return [...renames, ...additions, ...removals, ...idChanges, ...details]
}
