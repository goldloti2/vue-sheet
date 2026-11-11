import { describe, expect, it } from 'vitest'
import { layoutColumns, usableWidth } from '@/composables/list/useColumnWidths'

describe('usableWidth', () => {
  it('扣除左右外框後無條件捨去，不大於實際寬度', () => {
    expect(usableWidth(412.6, 0.8, 0.8)).toBe(411)
    expect(usableWidth(300, 1, 1)).toBe(298)
  })
})

describe('layoutColumns', () => {
  it('只有最小欄時，各欄均分可用寬度', () => {
    expect(layoutColumns(300, [{ width: 'min', content: 50 }, { width: 'min', content: 80 }])).toEqual([150, 150])
  })

  it('最小欄取內容寬，其餘的寬度歸預設欄', () => {
    expect(layoutColumns(300, [{ width: 'default', content: 500 }, { width: 'min', content: 40 }])).toEqual([260, 40])
  })

  it('最小欄放不下時與預設欄均分', () => {
    expect(layoutColumns(200, [{ width: 'default', content: 10 }, { width: 'min', content: 300 }])).toEqual([100, 100])
  })

  it('最大欄取內容寬，預設欄分剩下的寬度', () => {
    expect(layoutColumns(300, [{ width: 'max', content: 100 }, { width: 'default', content: 50 }])).toEqual([100, 200])
  })

  it('沒有預設欄且仍有剩餘時，剩餘的寬度歸最大欄', () => {
    expect(layoutColumns(300, [{ width: 'max', content: 100 }, { width: 'min', content: 50 }])).toEqual([250, 50])
  })

  it('全部放不下時，預設欄不少於把最大欄也算作一份時的寬度', () => {
    const widths = layoutColumns(300, [{ width: 'max', content: 400 }, { width: 'default', content: 100 }, { width: 'default', content: 100 }])
    expect(widths).toEqual([400, 100, 100])
  })
})
