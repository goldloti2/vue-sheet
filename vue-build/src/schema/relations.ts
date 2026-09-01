import type { TableKey } from './index'
import { schemas } from './index'

export interface Relation {
  childTable: TableKey
  column: string
  parentTable: TableKey
}

// 掃過所有 schema 的 ref 欄位自動算出關聯圖；新增關聯只要在 schema 標 type: 'ref'，不用手動維護這份清單
export const relations: Relation[] = Object.entries(schemas).flatMap(([table, schema]) => {
  const childTable = table as TableKey
  const result: Relation[] = []

  for (const column of schema.columns) {
    if (column.type === 'ref') {
      result.push({ childTable, column: column.key, parentTable: column.refTable as TableKey })
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
