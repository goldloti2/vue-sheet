import type { ChildRow, ParentRow } from './schema'
import type { RealTableKey, TableKey } from '@/schema'
import type { RowBase, VirtualRule, VirtualTableSchema } from '@/schema/types'
import { CHILDREN, PARENTS, schemas as realSchemas } from './schema'

// 測試用的虛擬表：三張真實表加上一張虛擬表，以 vi.mock 取代 @/schema

export { CHILDREN, NOTES, PARENTS } from './schema'

export interface LedgerRow extends RowBase {
  kind: string | null
  amount: number | null
  parent: string | null
  child: string | null
  day: Date | null
  readonly $parent?: ParentRow
  readonly $child?: ChildRow
  readonly doubled: number | null
}

// 測試的表不在 src 的 schemas 中，來源列的型別無法依 table 推導，於此轉型
function rule<Source> (table: RealTableKey, when: (source: Source) => boolean, values: Record<string, unknown>): VirtualRule<LedgerRow> {
  return { table, when, values } as unknown as VirtualRule<LedgerRow>
}

// 第 1、2 條規則的來源表相同，金額大於 5000 的子列各產生兩列。第 2 條規則的日期經由 getter 讀取父表
const ledger: VirtualTableSchema<LedgerRow> = {
  tableLabel: '帳目',
  labelColumn: 'kind',
  columns: [
    { key: 'kind', label: '種類', type: 'select', options: ['金額', '大額', '父表費用'] },
    { key: 'amount', label: '金額', type: 'number' },
    { key: 'parent', label: '父列', type: 'ref', refTable: 'parents' },
    { key: 'child', label: '子列', type: 'ref', refTable: 'children' },
    { key: 'day', label: '日期', type: 'date' },
  ],
  rules: [
    rule<ChildRow>(CHILDREN, child => child.amount !== null && child.$parent?.status !== '已完成', {
      kind: '金額',
      amount: (child: ChildRow) => child.amount,
      parent: (child: ChildRow) => child.parent,
      child: (child: ChildRow) => child.id,
      day: (child: ChildRow) => child.day,
    }),
    rule<ChildRow>(CHILDREN, child => (child.amount ?? 0) > 5000, {
      kind: '大額',
      amount: (child: ChildRow) => child.amount,
      parent: (child: ChildRow) => child.parent,
      child: (child: ChildRow) => child.id,
      day: (child: ChildRow) => child.$parent?.startDate ?? null,
    }),
    rule<ParentRow>(PARENTS, parent => (parent.fee ?? 0) > 0, {
      kind: '父表費用',
      amount: (parent: ParentRow) => parent.fee,
      parent: (parent: ParentRow) => parent.id,
    }),
  ],
  virtualColumns: [
    { key: 'doubled', label: '兩倍', type: 'number', value: row => row.amount === null ? null : row.amount * 2 },
  ],
}

export const schemas = { ...realSchemas, ledger }

export const LEDGER = 'ledger' as string as TableKey
