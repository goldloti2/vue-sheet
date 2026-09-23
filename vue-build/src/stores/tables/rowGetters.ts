import type { TableKey } from '@/schema'
import type { Relation } from '@/schema/relations'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { schemas } from '@/schema'
import { childRelations } from '@/schema/relations'
import { rowLabel, sortRows } from '@/schema/types'

// 沒有子列時共用同一個空陣列，getter 的回傳值身分才穩定
const NO_ROWS: unknown[] = []

// 掛在 row 上、讀起來跟真實欄位一樣的 getter，讀的都是傳進來的那份快取
export function createRowGetters (rows: Partial<Record<TableKey, unknown[]>>) {
  // 每條關聯的索引只建一次；重算與否由 computed 自己判斷（依賴的是 rows[子表]）
  const childIndexes = new Map<string, ComputedRef<Map<string, unknown[]>>>()

  // 一條關聯一份索引：父 id → 指向它的子列，照子表的 defaultSort 排好。建立一次，之後靠 computed 自己失效
  function childIndex (relation: Relation): ComputedRef<Map<string, unknown[]>> {
    const key = `${relation.childTable}.${relation.column}`
    const existing = childIndexes.get(key)
    if (existing) {
      return existing
    }

    const index = computed(() => {
      const grouped = new Map<string, unknown[]>()
      // 整張子表先排一次，分組後每組自然是對的順序
      for (const row of sortRows(rows[relation.childTable] ?? [], schemas[relation.childTable])) {
        const parentId = (row as Record<string, unknown>)[relation.column]
        if (typeof parentId !== 'string') {
          continue
        }

        const siblings = grouped.get(parentId)
        if (siblings) {
          siblings.push(row)
        } else {
          grouped.set(parentId, [row])
        }
      }
      return grouped
    })

    childIndexes.set(key, index)
    return index
  }

  // 沿著一條關聯找指向這一列的子列。子表還沒載就是空的，載進來後讀它的地方會自己重算。
  // 回傳的是索引裡那一份，不要就地改它（sort / push 會污染索引）
  function relatedRows (relation: Relation, parentId: string): unknown[] {
    return childIndex(relation).value.get(parentId) ?? NO_ROWS
  }

  function defineGetter (row: object, key: string, get: () => unknown): void {
    Object.defineProperty(row, key, { configurable: true, get })
  }

  // 不可列舉，spread / JSON / Object.keys 都看不到：
  // 虛擬欄位、$label（這一列的名字）、每個 ref 欄位的 $欄位key（父列）、每張子表的 $子表_欄位key（子列陣列）
  function attachGetters<Row extends { id: string }> (table: TableKey, row: Row): Row {
    // 用不帶 Row 的 TableSchema 接，否則 schemas[table] 是各表 schema 的 union，value 的參數會變成所有 Row 的交集
    const schema: TableSchema = schemas[table]

    for (const column of schema.virtualColumns ?? []) {
      defineGetter(row, column.key, () => column.value(row))
    }

    defineGetter(row, '$label', () => rowLabel(row, schema))

    for (const column of schema.columns) {
      if (column.type === 'ref') {
        const parentTable = column.refTable as TableKey
        defineGetter(row, `$${column.key}`, () => {
          const id = (row as Record<string, unknown>)[column.key]
          return (rows[parentTable] ?? []).find(candidate => (candidate as { id: string }).id === id)
        })
      }
    }

    // 名字帶上子表的 ref 欄位（$child_parent），同一張子表兩個 ref 指過來也不會撞
    for (const relation of childRelations(table)) {
      defineGetter(row, `$${relation.childTable}_${relation.column}`, () => relatedRows(relation, row.id))
    }

    return row
  }

  return { attachGetters }
}
