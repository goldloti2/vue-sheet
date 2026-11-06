import { describe, expect, it } from 'vitest'
import { filterableColumns, hasActiveFilter, isActiveFilter, matchesFilter, presentValues, rowMatcher } from '@/schema/filter'
import { sampleSchema } from '../fixtures/schema'

function column (key: string) {
  const found = sampleSchema.columns.find(candidate => candidate.key === key)
  if (!found) {
    throw new Error(key)
  }
  return found
}

describe('filterableColumns', () => {
  it('依 searchable 的順序，只列出由篩選抽屜處理的型別', () => {
    expect(filterableColumns(sampleSchema).map(c => c.key)).toEqual(['price', 'day', 'done', 'time', 'status', 'tag'])
  })
})

describe('isActiveFilter', () => {
  it('有勾選、上下限或圖表的區間時生效', () => {
    expect(isActiveFilter(undefined)).toBe(false)
    expect(isActiveFilter({ values: [] })).toBe(false)
    expect(isActiveFilter({ min: null, max: null })).toBe(false)
    expect(isActiveFilter({ values: [null] })).toBe(true)
    expect(isActiveFilter({ min: 0 })).toBe(true)
    expect(isActiveFilter({ segment: { min: 1 } })).toBe(true)
  })
})

describe('hasActiveFilter', () => {
  it('只計入可篩選的欄位上的條件', () => {
    expect(hasActiveFilter({ level: { min: 1 } }, sampleSchema)).toBe(false)
    expect(hasActiveFilter({ name: { values: ['甲'] } }, sampleSchema)).toBe(false)
    expect(hasActiveFilter({ status: { values: ['高'] } }, sampleSchema)).toBe(true)
  })
})

describe('matchesFilter', () => {
  it('勾選的值中 null 代表空白，空字串也算空白', () => {
    const filter = { values: ['高', null] }
    expect(matchesFilter('高', filter)).toBe(true)
    expect(matchesFilter('中', filter)).toBe(false)
    expect(matchesFilter(null, filter)).toBe(true)
    expect(matchesFilter('', filter)).toBe(true)
  })

  it('範圍包含兩端，空值不符合', () => {
    const filter = { min: 10, max: 20 }
    expect(matchesFilter(10, filter)).toBe(true)
    expect(matchesFilter(20, filter)).toBe(true)
    expect(matchesFilter(21, filter)).toBe(false)
    expect(matchesFilter(null, filter)).toBe(false)
  })

  it('日期以時間比較，時長以秒數比較', () => {
    expect(matchesFilter(new Date(2026, 0, 2), { min: new Date(2026, 0, 1) })).toBe(true)
    expect(matchesFilter('9:00:00', { min: '10:00:00' })).toBe(false)
    expect(matchesFilter('10:00:00', { max: '9:30:00' })).toBe(false)
  })

  it('圖表的區間包含下限、不含上限，沒有上限時不設限', () => {
    expect(matchesFilter(10, { segment: { min: 10, below: 20 } })).toBe(true)
    expect(matchesFilter(20, { segment: { min: 10, below: 20 } })).toBe(false)
    expect(matchesFilter(999, { segment: { min: 10 } })).toBe(true)
  })
})

describe('rowMatcher', () => {
  it('沒有生效的條件時為 null', () => {
    expect(rowMatcher({}, sampleSchema)).toBeNull()
    expect(rowMatcher({ level: { min: 1 } }, sampleSchema)).toBeNull()
  })

  it('欄位之間為 AND，略過不可篩選的欄位', () => {
    const match = rowMatcher({ status: { values: ['高'] }, price: { min: 10 }, level: { min: 99 } }, sampleSchema)
    expect(match?.({ status: '高', price: 10, level: 1 })).toBe(true)
    expect(match?.({ status: '高', price: 5, level: 1 })).toBe(false)
    expect(match?.({ status: '中', price: 10, level: 1 })).toBe(false)
  })
})

describe('presentValues', () => {
  it('選項依 options 的順序，其他的值依出現次數再依字串，並標示有沒有空白', () => {
    const rows = [{ tag: 'B' }, { tag: 'z' }, { tag: 'y' }, { tag: 'y' }, { tag: 'A' }, { tag: null }]
    expect(presentValues(rows, column('tag'))).toEqual({ known: ['A', 'B'], extra: ['y', 'z'], hasBlank: true })
  })

  it('boolean 依是、否的順序', () => {
    expect(presentValues([{ done: false }, { done: true }], column('done')).known).toEqual(['true', 'false'])
  })
})
