import type { TableKey } from './index'
import { schemas } from './index'

export interface Relation {
  childTable: TableKey
  column: string
  parentTable: TableKey
  // 刪除父列時是否一併刪除其子列（ref 欄位的 onDelete）
  onDelete?: 'cascade'
  // 父列因子列減少而沒有子列時，是否刪除父列（ref 欄位的 onEmpty）
  onEmpty?: 'delete'
}

// 由所有 schema 的 ref 欄位自動算出關聯。新增關聯時只須在 schema 中標示 type: 'ref'
export const relations: Relation[] = Object.entries(schemas).flatMap(([table, schema]) => {
  const childTable = table as TableKey
  const result: Relation[] = []

  for (const column of schema.columns) {
    if (column.type === 'ref') {
      result.push({ childTable, column: column.key, parentTable: column.refTable as TableKey, onDelete: column.onDelete, onEmpty: column.onEmpty })
    }
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
