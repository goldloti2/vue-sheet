import type { TableSchema } from './types'

export const schemas: Record<string, TableSchema> = {}

export type TableKey = string

// 真實表：沒有 rules 的表。寫入的路徑只接受真實表
export type RealTableKey = {
  [K in TableKey]: (typeof schemas)[K] extends { rules: unknown } ? never : K
}[TableKey]

// 虛擬表：有 rules 的表
export type VirtualTableKey = Exclude<TableKey, RealTableKey>
