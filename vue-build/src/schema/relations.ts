import type { TableKey } from './index'
import { schemas } from './index'

export interface Relation {
  childTable: TableKey
  column: string
  parentTable: TableKey
  // 父列被刪時要不要連帶刪掉指向它的子列（ref 欄位的 onDelete）
  onDelete?: 'cascade'
}

// 掃過所有 schema 的 ref 欄位自動算出關聯圖；新增關聯只要在 schema 標 type: 'ref'，不用手動維護這份清單
export const relations: Relation[] = Object.entries(schemas).flatMap(([table, schema]) => {
  const childTable = table as TableKey
  const result: Relation[] = []

  for (const column of schema.columns) {
    if (column.type === 'ref') {
      result.push({ childTable, column: column.key, parentTable: column.refTable as TableKey, onDelete: column.onDelete })
    }
  }

  return result
})

export function getRelation (childTable: TableKey, parentTable: TableKey): Relation {
  const relation = relations.find(candidate => candidate.childTable === childTable && candidate.parentTable === parentTable)
  if (!relation) {
    throw new Error(`no relation from "${childTable}" to "${parentTable}"`)
  }
  return relation
}

// 這張表的列被刪時要跟著刪的關聯（標了 cascade 的子表 ref 欄位）
export function cascadeRelations (parentTable: TableKey): Relation[] {
  return relations.filter(candidate => candidate.parentTable === parentTable && candidate.onDelete === 'cascade')
}
