import { describe, expect, it } from 'vitest'
import { sortableColumns, sortByKey, sortRows } from '@/schema/sort'
import { sampleSchema } from '../fixtures/schema'

function names (rows: { name: string }[]) {
  return rows.map(row => row.name)
}

describe('sortRows', () => {
  it('沒有任何排序時維持原本的順序', () => {
    const rows = [{ name: 'b' }, { name: 'a' }]
    const sorted = sortRows(rows, sampleSchema)
    expect(names(sorted)).toEqual(['b', 'a'])
    expect(sorted).not.toBe(rows)
  })

  it('select 依 options 的順序，options 以外的值排在後面，空值排在最後', () => {
    const rows = [
      { name: '1', status: '低' },
      { name: '2', status: null },
      { name: '3', status: '其他' },
      { name: '4', status: '高' },
    ]
    expect(names(sortRows(rows, sampleSchema, [{ key: 'status', direction: 'asc' }]))).toEqual(['4', '1', '3', '2'])
  })

  it('desc 只反轉有值者之間的順序，空值仍在最後', () => {
    const rows = [{ name: '1', price: null }, { name: '2', price: 1 }, { name: '3', price: 3 }]
    expect(names(sortRows(rows, sampleSchema, [{ key: 'price', direction: 'desc' }]))).toEqual(['3', '2', '1'])
  })

  it('boolean 否在前，是在後', () => {
    const rows = [{ name: '1', done: true }, { name: '2', done: false }]
    expect(names(sortRows(rows, sampleSchema, [{ key: 'done', direction: 'asc' }]))).toEqual(['2', '1'])
  })

  it('字串中的數字依數值，時長依秒數', () => {
    const rows = [{ name: 'a10' }, { name: 'a2' }]
    expect(names(sortRows(rows, sampleSchema, [{ key: 'name', direction: 'asc' }]))).toEqual(['a2', 'a10'])

    const times = [{ name: '1', time: '10:00:00' }, { name: '2', time: '9:00:00' }]
    expect(names(sortRows(times, sampleSchema, [{ key: 'time', direction: 'asc' }]))).toEqual(['2', '1'])
  })

  it('ref 依父列的名稱', () => {
    const rows = [{ name: '1', parent: 'P1', $parent: { $label: 'B' } }, { name: '2', parent: 'P2', $parent: { $label: 'A' } }]
    expect(names(sortRows(rows, sampleSchema, [{ key: 'parent', direction: 'asc' }]))).toEqual(['2', '1'])
  })

  it('使用者的排序在前，defaultSort 接在後面作為次要排序', () => {
    const schema = { ...sampleSchema, defaultSort: [{ key: 'name', direction: 'asc' as const }] }
    const rows = [{ name: 'b', done: true }, { name: 'c', done: false }, { name: 'a', done: true }]
    expect(names(sortRows(rows, schema))).toEqual(['a', 'b', 'c'])
    expect(names(sortRows(rows, schema, [{ key: 'done', direction: 'asc' }]))).toEqual(['c', 'a', 'b'])
  })
})

describe('sortableColumns', () => {
  it('依 sortable 的順序，略過 image', () => {
    expect(sortableColumns(sampleSchema).map(c => c.key)).not.toContain('photo')
    expect(sortableColumns(sampleSchema)[0].key).toBe('name')
  })
})

describe('sortByKey', () => {
  it('數字依數值，字串中的數字依數值', () => {
    expect(sortByKey([3, 10, 2], value => value)).toEqual([2, 3, 10])
    expect(sortByKey(['2026/10', '2026/9'], value => value)).toEqual(['2026/9', '2026/10'])
  })
})
