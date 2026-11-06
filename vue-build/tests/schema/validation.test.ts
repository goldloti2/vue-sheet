import type { TableSchema } from '@/schema/types'
import { describe, expect, it, vi } from 'vitest'
import { isEmpty, validateRow } from '@/schema/validation'
import { sampleSchema } from '../fixtures/schema'

const valid = { code: 'X-1', name: '甲' }

describe('isEmpty', () => {
  it('null、undefined 與空字串為空', () => {
    expect([null, undefined, ''].every(value => isEmpty(value))).toBe(true)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
  })
})

describe('validateRow', () => {
  it('全部合法時為空物件', () => {
    expect(validateRow(valid, sampleSchema)).toEqual({})
  })

  it('必填的欄位為空時有錯誤', () => {
    expect(validateRow({ ...valid, name: '' }, sampleSchema)).toHaveProperty('name')
  })

  it('數字超出 min、max 時有錯誤', () => {
    expect(validateRow({ ...valid, price: -1 }, sampleSchema)).toHaveProperty('price')
    expect(validateRow({ ...valid, price: 101 }, sampleSchema)).toHaveProperty('price')
    expect(validateRow({ ...valid, price: 100 }, sampleSchema)).toEqual({})
  })

  it('時長須為「時:分:秒」', () => {
    expect(validateRow({ ...valid, time: '1:30' }, sampleSchema)).toHaveProperty('time')
    expect(validateRow({ ...valid, time: '1:30:00' }, sampleSchema)).toEqual({})
  })

  it('select 只接受 options 中的值，allowCustom 時略過', () => {
    expect(validateRow({ ...valid, status: '其他' }, sampleSchema)).toHaveProperty('status')
    expect(validateRow({ ...valid, tag: '其他' }, sampleSchema)).toEqual({})
  })

  it('有 keys 時只檢查這些欄位', () => {
    expect(validateRow({ ...valid, name: '', price: -1 }, sampleSchema, ['price'])).toEqual({ price: expect.any(String) })
  })

  describe('主鍵', () => {
    it('沒有 newId 時為必填，有 newId 時可留空', () => {
      expect(validateRow({ ...valid, code: '' }, sampleSchema)).toHaveProperty('code')
      expect(validateRow({ ...valid, code: '' }, { ...sampleSchema, newId: () => 'N' })).toEqual({})
    })

    it('不能以數字或 =、+、-、\' 開頭，只能使用網址中不須轉換的字元', () => {
      for (const code of ['1A', '=A', '-A', 'A B', '甲', '.', '..']) {
        expect(validateRow({ ...valid, code }, sampleSchema)).toHaveProperty('code')
      }
      expect(validateRow({ ...valid, code: 'A_b-1.(x)' }, sampleSchema)).toEqual({})
    })
  })

  it('自訂的 validate 只在內建檢查通過且有值時呼叫', () => {
    const validate = vi.fn(() => '不行')
    const schema: TableSchema = {
      ...sampleSchema,
      columns: sampleSchema.columns.map(c => c.key === 'price' ? { ...c, validate } : c),
    }
    expect(validateRow({ ...valid, price: null }, schema)).toEqual({})
    expect(validateRow({ ...valid, price: 500 }, schema).price).not.toBe('不行')
    expect(validate).not.toHaveBeenCalled()
    expect(validateRow({ ...valid, price: 5 }, schema).price).toBe('不行')
    expect(validate).toHaveBeenCalledWith(5, { ...valid, price: 5 })
  })
})
