import type { RealTableKey } from '@/schema'
import type { VirtualRule, VirtualTableSchema } from '@/schema/types'
import { describe, expect, it, vi } from 'vitest'
import { buildVirtualRows, checkVirtualSchema, sourceTables, virtualOrder } from '@/schema/virtual'

const ORDERS = 'orders' as string as RealTableKey
const SHOPS = 'shops' as string as RealTableKey

interface Source {
  id: string
  price: number | null
  fee: number | null
}

// 規則的來源列型別依 src 的 schemas 推導，測試的表不在其中，於此轉型
const schema: VirtualTableSchema = {
  tableLabel: '測試',
  columns: [
    { key: 'kind', label: '種類', type: 'select', options: ['價格', '費用'] },
    { key: 'amount', label: '金額', type: 'number' },
    { key: 'note', label: '備註', type: 'text' },
    { key: 'photo', label: '圖片', type: 'image' },
  ],
  rules: [
    { table: ORDERS, when: (source: Source) => source.price !== null, values: { kind: '價格', amount: (source: Source) => source.price } },
    { table: ORDERS, when: (source: Source) => source.fee !== null, values: { kind: '費用', amount: (source: Source) => source.fee, note: () => undefined } },
    { table: SHOPS, values: { note: (source: Source) => source.id } },
  ] as unknown as VirtualRule[],
}

const sources: Record<string, Source[]> = {
  orders: [
    { id: 'O-1', price: 100, fee: 10 },
    { id: 'O-2', price: 200, fee: null },
    { id: 'O-3', price: null, fee: null },
  ],
  shops: [{ id: 'S-1', price: null, fee: null }],
}

describe('buildVirtualRows', () => {
  const rows = buildVirtualRows(schema, table => sources[table] ?? [])

  it('依規則的順序，來源列每符合一條規則即產生一列', () => {
    expect(rows.map(row => row.id)).toEqual(['O-1-1', 'O-2-1', 'O-1-2', 'S-1-3'])
  })

  it('值為常數或以來源列為參數的函數', () => {
    expect(rows[0]).toEqual({ id: 'O-1-1', kind: '價格', amount: 100, note: null, photo: null })
    expect(rows[2]).toMatchObject({ kind: '費用', amount: 10 })
  })

  it('規則沒有指定的欄位與函數回傳 undefined 時為 null', () => {
    expect(rows[2]?.note).toBeNull()
    expect(rows[3]).toEqual({ id: 'S-1-3', kind: null, amount: null, note: 'S-1', photo: null })
  })

  it('省略 when 時每一列皆產生', () => {
    expect(rows.filter(row => row.id.startsWith('S-'))).toHaveLength(1)
  })
})

describe('sourceTables', () => {
  it('依規則的順序，不重複', () => {
    expect(sourceTables(schema)).toEqual([ORDERS, SHOPS])
  })
})

describe('virtualOrder', () => {
  it('依 columns 逐欄升冪，略過 image', () => {
    expect(virtualOrder(schema)).toEqual([
      { key: 'kind', direction: 'asc' },
      { key: 'amount', direction: 'asc' },
      { key: 'note', direction: 'asc' },
    ])
  })
})

describe('checkVirtualSchema', () => {
  it('來源表不是真實表時拋出錯誤', () => {
    expect(() => checkVirtualSchema('test', schema, table => table === 'orders')).toThrow('test 的第 3 條規則：來源表 "shops" 不是真實表')
  })

  it('values 中有不在 columns 的 key 時拋出錯誤', () => {
    const broken: VirtualTableSchema = { ...schema, rules: [{ table: ORDERS, values: { missing: 1 } }] as unknown as VirtualRule[] }
    expect(() => checkVirtualSchema('test', broken, () => true)).toThrow('test 的第 1 條規則：values 中的 "missing" 不在 columns 中')
  })

  it('沒有問題時不拋出錯誤', () => {
    expect(() => checkVirtualSchema('test', schema, () => true)).not.toThrow()
  })
})

describe('relations 的檢查', () => {
  it('真實表的 ref 指向虛擬表時拋出錯誤', async () => {
    vi.resetModules()
    vi.doMock('@/schema', () => ({
      schemas: {
        real: { tableLabel: '真實', idColumn: 'code', columns: [{ key: 'code', label: '編號', type: 'text' }, { key: 'other', label: '虛擬', type: 'ref', refTable: 'virtual' }] },
        virtual: { tableLabel: '虛擬', columns: [], rules: [] },
      },
    }))
    await expect(import('@/schema/relations')).rejects.toThrow('real.other 的 refTable "virtual" 為虛擬表，真實表的 ref 只能指向真實表')
    vi.doUnmock('@/schema')
  })
})
