import type { RealTableKey, TableKey } from './index'
import { schemas } from './index'
import { isVirtualSchema } from './types'
import { checkVirtualSchema } from './virtual'

export interface Relation {
  childTable: TableKey
  column: string
  parentTable: TableKey
  // 刪除父列時是否一併刪除其子列（ref 欄位的 onDelete）
  onDelete?: 'cascade'
  // 父列因子列減少而沒有子列時，是否刪除父列（ref 欄位的 onEmpty）
  onEmpty?: 'delete'
}

// 已登記且不是虛擬表
export function isRealTable (table: string): table is RealTableKey {
  return table in schemas && !isVirtualSchema(schemas[table as TableKey])
}

// 由所有 schema 的 ref 欄位自動算出關聯。新增關聯時只須在 schema 中標示 type: 'ref'。真實表的 ref 指向虛擬表時拋出錯誤
export const relations: Relation[] = Object.entries(schemas).flatMap(([table, schema]) => {
  const childTable = table as TableKey
  const result: Relation[] = []

  if (isVirtualSchema(schema)) {
    checkVirtualSchema(table, schema, isRealTable)
  }

  for (const column of schema.columns) {
    if (column.type !== 'ref') {
      continue
    }
    if (!isVirtualSchema(schema) && column.refTable in schemas && !isRealTable(column.refTable)) {
      throw new Error(`${table}.${column.key} 的 refTable "${column.refTable}" 為虛擬表，真實表的 ref 只能指向真實表`)
    }
    result.push({ childTable, column: column.key, parentTable: column.refTable as TableKey, onDelete: column.onDelete, onEmpty: column.onEmpty })
  }

  return result
})

// 指向此表的關聯，子表的每個 ref 欄位各一條
export function childRelations (parentTable: TableKey): Relation[] {
  return relations.filter(candidate => candidate.parentTable === parentTable)
}

// 其中標示 cascade 的關聯：刪除此表的列時一併刪除子列
export function cascadeRelations (parentTable: TableKey): Relation[] {
  return childRelations(parentTable).filter(candidate => candidate.onDelete === 'cascade')
}

// 此表指向父表且標示 onEmpty 的關聯：此表的列減少時，檢查父列是否已沒有子列
export function emptyParentRelations (childTable: TableKey): Relation[] {
  return relations.filter(candidate => candidate.childTable === childTable && candidate.onEmpty === 'delete')
}
