import type { GroupLevel } from '@/schema/group'
import { describe, expect, it } from 'vitest'
import { flattenGroups, groupRows } from '@/schema/group'

interface Row {
  id: string
  year: number
  month: number | null
}

const levels: GroupLevel<Row>[] = [
  { sortKey: row => row.year, label: row => `${row.year}` },
  { sortKey: row => row.month ?? 99, label: row => row.month === null ? null : `${row.month} 月` },
]

const rows: Row[] = [
  { id: 'a', year: 2026, month: 10 },
  { id: 'b', year: 2025, month: 3 },
  { id: 'c', year: 2026, month: null },
  { id: 'd', year: 2026, month: 2 },
  { id: 'e', year: 2026, month: 10 },
]

describe('groupRows', () => {
  it('由外而內依 sortKey 分組，組內保留原本的順序', () => {
    expect(groupRows(rows, levels)).toEqual([
      { label: '2025', subgroups: [{ label: '3 月', rows: [rows[1]] }] },
      {
        label: '2026',
        subgroups: [
          { label: '2 月', rows: [rows[3]] },
          { label: '10 月', rows: [rows[0], rows[4]] },
          { label: null, rows: [rows[2]] },
        ],
      },
    ])
  })

  it('label 為 null 的列併為一個沒有標題的子組，位置為第一次出現之處', () => {
    const flat: GroupLevel<Row>[] = [{ sortKey: () => 0, label: row => row.month === null ? null : 'x' }]
    const mixed = [rows[0], rows[2], rows[3], { ...rows[2], id: 'f' }]
    expect(groupRows(mixed, flat)).toEqual([
      { label: 'x', rows: [rows[0]] },
      { label: null, rows: [rows[2], mixed[3]] },
      { label: 'x', rows: [rows[3]] },
    ])
  })
})

describe('flattenGroups', () => {
  it('攤平後的順序與畫面由上往下相同', () => {
    expect(flattenGroups(groupRows(rows, levels)).map(row => row.id)).toEqual(['b', 'd', 'a', 'e', 'c'])
  })
})
