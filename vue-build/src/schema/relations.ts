import type { TableKey } from './index'
import { schemas } from './index'

export interface Relation {
  childTable: TableKey
  column: string
  parentTable: TableKey
  // 父列被刪時要不要連帶刪掉指向它的子列（ref 欄位的 onDelete）
  onDelete?: 'cascade'
  // 子列減少而使父列沒有子列時要不要刪掉父列（ref 欄位的 onEmpty）
  onEmpty?: 'delete'
}

// 掃過所有 schema 的 ref 欄位自動算出關聯圖；新增關聯只要在 schema 標 type: 'ref'，不用手動維護這份清單
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

// 指向這張表的關聯（每個子表的 ref 欄位一條）
export function childRelations (parentTable: TableKey): Relation[] {
  return relations.filter(candidate => candidate.parentTable === parentTable)
}

// 其中標了 cascade 的：這張表的列被刪時要跟著刪
export function cascadeRelations (parentTable: TableKey): Relation[] {
  return childRelations(parentTable).filter(candidate => candidate.onDelete === 'cascade')
}

// 這張表指出去、標了 onEmpty 的：這張表的列減少時要檢查父列是否已空
export function emptyParentRelations (childTable: TableKey): Relation[] {
  return relations.filter(candidate => candidate.childTable === childTable && candidate.onEmpty === 'delete')
}
