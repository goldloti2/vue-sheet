import { afterEach, describe, expect, it, vi } from 'vitest'
import { optionsOf } from '@/schema/options'
import { CHILDREN, PARENTS } from '../fixtures/backend/schema'

vi.mock('@/schema', () => import('../fixtures/backend/schema'))

// PARENTS 與 CHILDREN 的型別為所有真實表的聯集，欄位的 key 因此以 never 傳入
describe('optionsOf', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  afterEach(() => {
    warn.mockClear()
  })

  it('回傳 select 欄位的選項，順序即宣告的順序', () => {
    expect(optionsOf(PARENTS, 'status' as never)).toEqual(['未開始', '進行中', '暫停', '已完成'])
    expect(warn).not.toHaveBeenCalled()
  })

  it('虛擬欄位為 select 時也回傳其選項', () => {
    expect(optionsOf(CHILDREN, 'status' as never)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('欄位不是 select 時回傳空陣列並警告', () => {
    expect(optionsOf(PARENTS, 'note' as never)).toEqual([])
    expect(warn).toHaveBeenCalledWith('optionsOf（父表）：備註（text）不是 select')
  })

  it('找不到欄位時回傳空陣列並警告', () => {
    expect(optionsOf(PARENTS, 'missing' as never)).toEqual([])
    expect(warn).toHaveBeenCalledWith('optionsOf（父表）：找不到欄位 missing')
  })
})
