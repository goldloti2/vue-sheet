import type { TableKey } from '@/schema'
import type { Relation } from '@/schema/relations'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { schemas } from '@/schema'
import { childRelations } from '@/schema/relations'
import { sortRows } from '@/schema/sort'
import { allColumns, rowLabel } from '@/schema/types'

// 沒有子列時共用同一個空陣列，getter 的回傳值才保持同一個參照
const NO_ROWS: unknown[] = []

// 掛在 row 上的 getter，讀法與真實欄位相同，讀取傳入的快取
export function createRowGetters (rows: Partial<Record<TableKey, unknown[]>>) {
  // 每條關聯的索引只建立一次，由 computed 依 rows[子表] 判斷是否重算
  const childIndexes = new Map<string, ComputedRef<Map<string, unknown[]>>>()
  const idIndexes = new Map<TableKey, ComputedRef<Map<string, unknown>>>()

  // 每張表一份「id → 列」，供 ref 欄位查找父列
  function idIndex (table: TableKey): ComputedRef<Map<string, unknown>> {
    const existing = idIndexes.get(table)
    if (existing) {
      return existing
    }

    const index = computed(() => new Map(
      (rows[table] ?? []).map(row => [(row as { id: string }).id, row]),
    ))

    idIndexes.set(table, index)
    return index
  }

  // 每條關聯一份索引：父列 id → 子列，依子表的 defaultSort 排序。建立一次，由 computed 自行失效
  function childIndex (relation: Relation): ComputedRef<Map<string, unknown[]>> {
    const key = `${relation.childTable}.${relation.column}`
    const existing = childIndexes.get(key)
    if (existing) {
      return existing
    }

    const index = computed(() => {
      const grouped = new Map<string, unknown[]>()
      // 先排序整張子表，分組後每組即為正確的順序
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

  // 沿關聯查找此列的子列，子表未載入時為空。回傳索引中的陣列，不可就地修改（sort、push）
  function relatedRows (relation: Relation, parentId: string): unknown[] {
    return childIndex(relation).value.get(parentId) ?? NO_ROWS
  }

  function defineGetter (row: object, key: string, get: () => unknown): void {
    Object.defineProperty(row, key, { configurable: true, get })
  }

  // 掛上不可列舉的 getter（spread、JSON、Object.keys 皆看不到），種類見 docs/topics/schema.md 的「row 上的 getter」
  function attachGetters<Row extends { id: string }> (table: TableKey, row: Row): Row {
    // 刻意以不帶 Row 的 TableSchema 接收，否則 value 的參數成為所有 Row 的交集
    const schema: TableSchema = schemas[table]

    for (const column of schema.virtualColumns ?? []) {
      defineGetter(row, column.key, () => column.value(row))
    }

    defineGetter(row, '$label', () => rowLabel(row, schema))

    for (const column of allColumns(schema)) {
      if (column.type === 'ref') {
        const parentTable = column.refTable as TableKey
        defineGetter(row, `$${column.key}`, () => {
          const id = (row as Record<string, unknown>)[column.key]
          return typeof id === 'string' ? idIndex(parentTable).value.get(id) : undefined
        })
      }
    }

    // 名稱含子表的 ref 欄位（$子表_欄位key），同一張子表有兩個 ref 指向此表時也不衝突
    for (const relation of childRelations(table)) {
      defineGetter(row, `$${relation.childTable}_${relation.column}`, () => relatedRows(relation, row.id))
    }

    return row
  }

  return { attachGetters }
}
