import { describe, expect, it, vi } from 'vitest'
import { defineChart } from '@/schema/chart'
import { defineCardView, defineView, fitsView } from '@/schema/view'
import { PARENTS } from '../fixtures/backend/schema'

vi.mock('@/schema', () => import('../fixtures/backend/schema'))

// PARENTS 的型別為所有真實表的聯集，view 與圖表的設定因此以 never 傳入
const row = { id: 'P-0001', code: 'P-0001', status: '進行中', fee: 1200 }

describe('以表的 key 查找 schema', () => {
  it('defineView 依 key 對應的 schema 格式化各位置', () => {
    const view = defineView(PARENTS, { title: 'code', subtitle: 'status' } as never)

    expect(view(row as never)).toMatchObject({ title: { text: 'P-0001' }, subtitle: { text: '進行中' }, actions: [] })
  })

  it('defineCardView 依 key 對應的 schema 格式化 header 與 body', () => {
    const view = defineCardView(PARENTS, { header: { title: 'code' }, body: { summary: 'status' } } as never)

    expect(view(row as never)).toMatchObject({ header: { title: { text: 'P-0001' } }, body: { summary: { text: '進行中' } } })
  })

  it('defineChart 依 key 對應的 schema 列出 select 的選項', () => {
    const chart = defineChart(PARENTS, { type: 'bar', group: { key: 'status' }, values: [{ stat: 'count' }] } as never)
    const data = chart.compute([row as never])

    expect(data.kind === 'category' && data.labels).toEqual(['未開始', '進行中', '暫停', '已完成'])
  })
})

describe('fitsView', () => {
  const view = defineView(PARENTS, { title: 'code' } as never)
  const cardView = defineCardView(PARENTS, { header: { title: 'code' } } as never)

  it('card 使用 defineCardView 的 view', () => {
    expect(fitsView('card', cardView)).toBe(true)
    expect(fitsView('card', view)).toBe(false)
  })

  it.each(['list', 'profile', 'gallery'] as const)('%s 使用 defineView 的 view', item => {
    expect(fitsView(item, view)).toBe(true)
    expect(fitsView(item, cardView)).toBe(false)
  })
})
