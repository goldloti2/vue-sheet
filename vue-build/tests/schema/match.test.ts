import { describe, expect, it } from 'vitest'
import { compactMatch, matchDefaults, matchesRow } from '@/schema/match'
import { schemas } from '../fixtures/backend/schema'

describe('compactMatch', () => {
  it('略過值為 undefined 的鍵，保留 null 與 false', () => {
    expect(compactMatch({ status: undefined, note: null, done: false })).toEqual({ note: null, done: false })
  })
})

describe('matchesRow', () => {
  it('每個鍵皆須相等', () => {
    const row = { status: '進行中', fee: 0 }

    expect(matchesRow(row, { status: '進行中', fee: 0 })).toBe(true)
    expect(matchesRow(row, { status: '進行中', fee: 1 })).toBe(false)
    expect(matchesRow(row, {})).toBe(true)
  })

  it('嚴格相等：空白不等於 false', () => {
    expect(matchesRow({ done: null }, { done: false })).toBe(false)
    expect(matchesRow({ done: null }, { done: null })).toBe(true)
  })

  it('日期比較時間值', () => {
    const row = { day: new Date(2021, 3, 8) }

    expect(matchesRow(row, { day: new Date(2021, 3, 8) })).toBe(true)
    expect(matchesRow(row, { day: new Date(2021, 3, 9) })).toBe(false)
  })
})

describe('matchDefaults', () => {
  it('只取真實欄位，虛擬欄位略過', () => {
    expect(matchDefaults(schemas.children, { parent: 'P-0001', status: '進行中' })).toEqual({ parent: 'P-0001' })
  })
})
