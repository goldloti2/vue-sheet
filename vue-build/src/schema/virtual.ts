import type { RealTableKey } from './index'
import type { SortSpec, VirtualTableSchema } from './types'

// 虛擬表：純函數。反應式的包裝與 getter 位於 stores/tables

// 框架端讀取規則的形狀，不區分來源表
interface LooseRule {
  table: RealTableKey
  when?: (source: object) => boolean
  values: Record<string, unknown>
}

function looseRules (schema: VirtualTableSchema): LooseRule[] {
  return schema.rules as LooseRule[]
}

// 規則的來源表，依規則的順序，不重複
export function sourceTables (schema: VirtualTableSchema): RealTableKey[] {
  return [...new Set(looseRules(schema).map(rule => rule.table))]
}

// 原始順序：依 columns 逐欄升冪，略過 image
export function virtualOrder (schema: VirtualTableSchema): SortSpec[] {
  return schema.columns.filter(column => column.type !== 'image').map(column => ({ key: column.key, direction: 'asc' }))
}

// 依規則的順序掃過來源表，來源列每符合一條規則即產生一列。id 為「來源列的 id-規則的序號」，規則沒有指定的欄位為 null
export function buildVirtualRows (schema: VirtualTableSchema, sourceRows: (table: RealTableKey) => readonly unknown[]): (Record<string, unknown> & { id: string })[] {
  return looseRules(schema).flatMap((rule, index) => sourceRows(rule.table)
    .filter(source => rule.when?.(source as object) ?? true)
    .map(source => {
      const row: Record<string, unknown> & { id: string } = { id: `${(source as { id: string }).id}-${index + 1}` }
      for (const column of schema.columns) {
        const value = rule.values[column.key]
        row[column.key] = (typeof value === 'function' ? value(source) : value) ?? null
      }
      return row
    }))
}

// 規則中 values 的 key 皆須為 columns 中的欄位，table 須為真實表。不符時拋出錯誤
export function checkVirtualSchema (table: string, schema: VirtualTableSchema, isReal: (table: string) => boolean): void {
  const keys = new Set(schema.columns.map(column => column.key))
  for (const [index, rule] of looseRules(schema).entries()) {
    if (!isReal(rule.table)) {
      throw new Error(`${table} 的第 ${index + 1} 條規則：來源表 "${rule.table}" 不是真實表`)
    }
    for (const key of Object.keys(rule.values)) {
      if (!keys.has(key)) {
        throw new Error(`${table} 的第 ${index + 1} 條規則：values 中的 "${key}" 不在 columns 中`)
      }
    }
  }
}
