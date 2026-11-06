import { describe, expect, it } from 'vitest'
import { coerceRow, durationSeconds, emptyRow, formatColumnValue, formatDuration, idColumnOf, rowLabel, serializeRow } from '@/schema/types'
import { sampleSchema } from '../fixtures/schema'

function column (key: string) {
  const found = [...sampleSchema.columns, ...sampleSchema.virtualColumns ?? []].find(candidate => candidate.key === key)
  if (!found) {
    throw new Error(key)
  }
  return found
}

describe('durationSeconds', () => {
  it('將「時:分:秒」換算為秒', () => {
    expect(durationSeconds('1:02:03')).toBe(3723)
    expect(durationSeconds('30:15:00')).toBe(108_900)
  })

  it('格式不符或不是字串時為 null', () => {
    expect(durationSeconds('1:60:00')).toBeNull()
    expect(durationSeconds('1:02')).toBeNull()
    expect(durationSeconds(null)).toBeNull()
  })

  it('與 formatDuration 互為反函數', () => {
    expect(formatDuration(durationSeconds('12:34:56') ?? 0)).toBe('12:34:56')
    expect(formatDuration(59.6)).toBe('0:01:00')
  })
})

describe('coerceRow', () => {
  const raw = {
    編號: 'X-1',
    名稱: '甲',
    PRICE: '12.5',
    等級: 'abc',
    日期: '2026/11/05 13:45',
    完成: ' true ',
    時長: '01:30',
    狀態: '中',
    標籤: '',
  }
  const row = coerceRow<Record<string, unknown>>(raw, sampleSchema)

  it('id 取自主鍵的表頭，表頭有 sheetHeader 時使用 sheetHeader', () => {
    expect(row.id).toBe('X-1')
    expect(row.price).toBe(12.5)
  })

  it('無法轉換的數字、空字串與缺少的欄位為 null', () => {
    expect(row.level).toBeNull()
    expect(row.tag).toBeNull()
    expect(row.photo).toBeNull()
  })

  it('日期歸零至當天的午夜', () => {
    expect(row.day).toEqual(new Date(2026, 10, 5))
  })

  it('boolean 不分大小寫，其他文字為 null', () => {
    expect(row.done).toBe(true)
    expect(coerceRow<Record<string, unknown>>({ 完成: 'FALSE' }, sampleSchema).done).toBe(false)
    expect(coerceRow<Record<string, unknown>>({ 完成: 'yes' }, sampleSchema).done).toBeNull()
  })

  it('時長補上秒數，分秒超過 59 時為 null', () => {
    expect(row.time).toBe('1:30:00')
    expect(coerceRow<Record<string, unknown>>({ 時長: '1:75' }, sampleSchema).time).toBeNull()
  })
})

describe('serializeRow', () => {
  it('只輸出有給的欄位，以 Sheet 的表頭為鍵', () => {
    expect(serializeRow({ price: 7, done: false }, sampleSchema)).toEqual({ PRICE: '7', 完成: 'FALSE' })
  })

  it('日期為 yyyy/mm/dd，空值為空字串', () => {
    expect(serializeRow({ day: new Date(2026, 0, 2), name: null }, sampleSchema)).toEqual({ 日期: '2026/01/02', 名稱: '' })
  })

  it('文字類的欄位遇到會被 Sheet 改變型別的字串時，前面加單引號', () => {
    for (const text of ['=1+1', '+886', '007', '1/2', '1e5', '2.5E-3']) {
      expect(serializeRow({ name: text }, sampleSchema).名稱).toBe(`'${text}`)
    }
    expect(serializeRow({ status: '0' }, sampleSchema).狀態).toBe(`'0`)
    expect(serializeRow({ name: 'a=1' }, sampleSchema).名稱).toBe('a=1')
  })

  it('數字欄位不加單引號', () => {
    expect(serializeRow({ level: 0 }, sampleSchema).等級).toBe('0')
  })
})

describe('formatColumnValue', () => {
  it('boolean 顯示為是、否，寫回 Sheet 為 TRUE、FALSE', () => {
    expect(formatColumnValue({ done: true }, column('done'))).toBe('是')
    expect(formatColumnValue({ done: false }, column('done'), 'sheet')).toBe('FALSE')
  })

  it('ref 顯示父列的名稱，父列不存在時顯示 id，寫回 Sheet 為 id', () => {
    expect(formatColumnValue({ parent: 'P1', $parent: { $label: '父' } }, column('parent'))).toBe('父')
    expect(formatColumnValue({ parent: 'P1' }, column('parent'))).toBe('P1')
    expect(formatColumnValue({ parent: 'P1', $parent: { $label: '父' } }, column('parent'), 'sheet')).toBe('P1')
  })

  it('null 與 undefined 為空字串', () => {
    expect(formatColumnValue({ name: null }, column('name'))).toBe('')
    expect(formatColumnValue({}, column('double'))).toBe('')
  })
})

describe('rowLabel', () => {
  it('取 labelColumn 的顯示文字，為空時取 id', () => {
    expect(rowLabel({ id: 'X-1', name: '甲' }, sampleSchema)).toBe('甲')
    expect(rowLabel({ id: 'X-1', name: null }, sampleSchema)).toBe('X-1')
  })
})

describe('emptyRow', () => {
  it('id 留空，default 為函式時求值，沒有 default 時為 null', () => {
    const schema = {
      ...sampleSchema,
      columns: [...sampleSchema.columns, { key: 'count', label: '數量', type: 'number' as const, default: () => 3 }],
    }
    const row = emptyRow<Record<string, unknown>>(schema)
    expect(row.id).toBe('')
    expect(row.count).toBe(3)
    expect(row.name).toBeNull()
  })
})

describe('idColumnOf', () => {
  it('idColumn 不在 columns 中時拋出錯誤', () => {
    expect(() => idColumnOf({ ...sampleSchema, idColumn: 'missing' })).toThrow()
  })
})
