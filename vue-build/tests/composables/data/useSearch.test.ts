import type { TableSchema } from '@/schema/types'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useSearch } from '@/composables/data/useSearch'
import { sampleSchema } from '../../fixtures/schema'

const rows = [
  { id: '1', name: 'Red Apple', status: '高', parent: 'P1', $parent: { $label: '水果' } },
  { id: '2', name: '香蕉 big', status: '中', parent: null },
  { id: '3', name: 'Green apple pie', status: '低', parent: 'P2', $parent: { $label: '點心' } },
]

function search (query: string, schema: TableSchema = sampleSchema) {
  return useSearch(query, rows, schema).value.map(row => row.id)
}

describe('useSearch', () => {
  it('空字串或只有空白時回傳全部的列', () => {
    expect(search('')).toEqual(['1', '2', '3'])
    expect(search(' '.repeat(3))).toEqual(['1', '2', '3'])
  })

  it('不分大小寫', () => {
    expect(search('APPLE')).toEqual(['1', '3'])
  })

  it('以空白分隔的每個詞皆須出現，順序不限', () => {
    expect(search('pie green')).toEqual(['3'])
    expect(search('apple 香蕉')).toEqual([])
  })

  it('雙引號內的文字為一個詞', () => {
    expect(search('"red apple"')).toEqual(['1'])
    expect(search('"apple red"')).toEqual([])
  })

  it('引號未閉合時，其後的整段為一個詞', () => {
    expect(search('"apple pie')).toEqual(['3'])
  })

  it('ref 欄位比對父列的名稱，不比對 id', () => {
    expect(search('點心')).toEqual(['3'])
    expect(search('P1')).toEqual([])
  })

  it('只比對 searchable 中的 text 與 ref 欄位', () => {
    expect(search('高')).toEqual([])
    expect(search('apple', { ...sampleSchema, searchable: ['parent'] })).toEqual([])
  })

  it('沒有可搜尋的欄位時回傳全部的列', () => {
    expect(search('apple', { ...sampleSchema, searchable: ['status'] })).toEqual(['1', '2', '3'])
  })

  it('搜尋字串改變時重新計算', () => {
    const query = ref('apple')
    const result = useSearch(query, rows, sampleSchema)
    expect(result.value).toHaveLength(2)
    query.value = 'big'
    expect(result.value.map(row => row.id)).toEqual(['2'])
  })
})
