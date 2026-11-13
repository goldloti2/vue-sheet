import { describe, expect, it } from 'vitest'
import { desktopSections } from '@/components/ui/shell/navSections'

const home = { title: '首頁', icon: 'home', to: '/home' }
const list = { title: '列表', icon: 'list', to: '/list' }
const other = { title: '其他', icon: 'other', to: '/other' }

describe('desktopSections', () => {
  it('底部導覽列的頁面為第一組，側邊欄的組接在其後', () => {
    expect(desktopSections([home, list], [{ title: '更多', items: [other] }])).toEqual([
      { items: [home, list] },
      { title: '更多', items: [other] },
    ])
  })

  it('已在第一組的頁面不再列出', () => {
    expect(desktopSections([home], [{ items: [home, other] }])).toEqual([
      { items: [home] },
      { items: [other] },
    ])
  })

  it('頁面全部重複的組不列出', () => {
    expect(desktopSections([home, list], [{ title: '更多', items: [list] }])).toEqual([
      { items: [home, list] },
    ])
  })

  it('沒有底部導覽列的頁面時只列側邊欄的組', () => {
    expect(desktopSections([], [{ items: [other] }])).toEqual([{ items: [other] }])
  })
})
