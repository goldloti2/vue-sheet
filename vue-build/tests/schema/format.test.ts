import type { TableSchema } from '@/schema/types'
import { describe, expect, it } from 'vitest'
import { displayValue } from '@/schema/format'
import { sampleSchema } from '../fixtures/schema'

const schema: TableSchema = {
  ...sampleSchema,
  formatRules: [
    { columns: ['price'], when: row => row.price > 50, color: 'red', bold: true, icon: 'mdi-up' },
    { columns: ['price', 'name'], when: row => row.price > 80, color: 'blue', strike: true, icon: 'mdi-alert', iconColor: 'orange' },
  ],
}

function column (key: string) {
  return schema.columns.find(candidate => candidate.key === key)!
}

describe('displayValue', () => {
  it('沒有符合的規則時只有文字', () => {
    expect(displayValue({ price: 10 }, schema, column('price'))).toEqual({ text: '10' })
  })

  it('符合的規則依宣告順序合併：顏色取第一個，樣式取聯集，圖示依序列出', () => {
    expect(displayValue({ price: 90 }, schema, column('price'))).toEqual({
      text: '90',
      format: {
        color: 'red',
        bold: true,
        italic: false,
        underline: false,
        strike: true,
        icons: [{ icon: 'mdi-up', color: undefined }, { icon: 'mdi-alert', color: 'orange' }],
      },
    })
  })

  it('只套用列出此欄的規則', () => {
    expect(displayValue({ name: '甲', price: 60 }, schema, column('name'))).toEqual({ text: '甲' })
    expect(displayValue({ name: '甲', price: 90 }, schema, column('name')).format?.color).toBe('blue')
  })

  it('值為空時不套用格式', () => {
    expect(displayValue({ name: null, price: 90 }, schema, column('name'))).toEqual({ text: '' })
  })
})
