import type { ChildRow, NoteRow, ParentRow } from '../../fixtures/backend/schema'
import type { useTablesStore } from '@/stores/tables'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let store: ReturnType<typeof useTablesStore>

beforeEach(async () => {
  await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(NOTES)
})

function parent (id: string) {
  return (store.rows[PARENTS] as ParentRow[]).find(row => row.id === id)!
}

function child (id: string) {
  return (store.rows[CHILDREN] as ChildRow[]).find(row => row.id === id)!
}

function note (id: string) {
  return (store.rows[NOTES] as NoteRow[]).find(row => row.id === id)!
}

describe('父列', () => {
  it('$欄位key 為快取中的父列', () => {
    expect(child('C-0001').$parent).toBe(parent('P-0001'))
  })

  it('ref 為空或找不到父列時為 undefined', () => {
    expect(note('N-0001').$related).toBeUndefined()
    store.update(NOTES, 'N-0001', { related: 'C-9999' })
    expect(note('N-0001').$related).toBeUndefined()
  })
})

describe('子列', () => {
  it('$子表_欄位key 依子表的 defaultSort 排序，空值排在最後', () => {
    expect(parent('P-0006').$children_parent.map(row => row.id)).toEqual(['C-0006', 'C-0007'])
  })

  it('子列的值改變後重新排序', () => {
    store.update(CHILDREN, 'C-0007', { day: new Date(2021, 0, 1) })
    expect(parent('P-0006').$children_parent.map(row => row.id)).toEqual(['C-0007', 'C-0006'])
  })

  it('同一張子表的兩個 ref 欄位各有一個 getter', () => {
    expect(child('C-0001').$notes_child.map(row => row.id)).toEqual(['N-0001'])
    expect(child('C-0001').$notes_related.map(row => row.id)).toEqual(['N-0002'])
  })

  it('沒有子列時為空陣列，每次讀取皆為同一個參照', () => {
    const empty = child('C-0002').$notes_child
    expect(empty).toEqual([])
    expect(child('C-0002').$notes_child).toBe(empty)
    expect(child('C-0003').$notes_related).toBe(empty)
  })
})

describe('虛擬欄位、$label 與 $table', () => {
  it('虛擬欄位可讀取父列與子列', () => {
    expect(parent('P-0006').total).toBe(976 + 1090 + 1097)
    expect(child('C-0004').status).toBe('進行中')
    expect(note('N-0002').parent).toBe('P-0006')
  })

  it('$label 為 labelColumn 的顯示文字，labelColumn 可為虛擬欄位', () => {
    expect(child('C-0001').$label).toBe('物件一')
    expect(parent('P-0006').$label).toBe('物件六')
  })

  it('$table 為此列所屬的表', () => {
    expect(child('C-0001').$table).toBe(CHILDREN)
    expect(parent('P-0001').$children_parent[0].$table).toBe(CHILDREN)
  })

  it('labelColumn 的值為空時為 id', () => {
    expect((store.withGetters(NOTES, { id: 'N-0100', content: null }) as NoteRow).$label).toBe('N-0100')
  })

  it('其他表的列改變後重新計算', () => {
    store.update(CHILDREN, 'C-0006', { amount: 10 })
    expect(parent('P-0006').total).toBe(976 + 10 + 1097)
    store.update(PARENTS, 'P-0004', { status: '暫停' })
    expect(child('C-0004').status).toBe('暫停')
  })
})

describe('getter 不可列舉', () => {
  it('Object.keys、spread 與 JSON 皆不含 getter', () => {
    const row = child('C-0001')
    expect(Object.keys(row)).toEqual(['id', 'code', 'parent', 'name', 'amount', 'fee', 'day', 'note'])
    expect({ ...row }).not.toHaveProperty('$parent')
    expect(JSON.stringify(row)).not.toContain('total')
  })
})

describe('withGetters', () => {
  it('暫時列有相同的 getter，但不加入快取', () => {
    const draft = store.withGetters(CHILDREN, { id: '', code: null, parent: 'P-0002', name: '草稿', amount: 5, fee: 1 }) as ChildRow
    expect(draft.$parent).toBe(parent('P-0002'))
    expect(draft.total).toBe(6)
    expect(draft.$label).toBe('草稿')
    expect(store.rows[CHILDREN]).toHaveLength(8)
  })
})
