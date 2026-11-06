import { describe, expect, it, vi } from 'vitest'
import { cascadeRelations, childRelations, emptyParentRelations, relations } from '@/schema/relations'
import { CHILDREN, NOTES, PARENTS } from '../fixtures/backend/schema'

vi.mock('@/schema', () => import('../fixtures/backend/schema'))

describe('relations', () => {
  it('每個真實的 ref 欄位一條，不含虛擬的 ref 欄位', () => {
    expect(relations).toEqual([
      { childTable: CHILDREN, column: 'parent', parentTable: PARENTS, onDelete: 'cascade', onEmpty: 'delete' },
      { childTable: NOTES, column: 'child', parentTable: CHILDREN, onDelete: 'cascade', onEmpty: undefined },
      { childTable: NOTES, column: 'related', parentTable: CHILDREN, onDelete: undefined, onEmpty: undefined },
    ])
  })

  it('childRelations 為指向此表的關聯，同一張子表的兩個 ref 各一條', () => {
    expect(childRelations(CHILDREN).map(relation => relation.column)).toEqual(['child', 'related'])
    expect(childRelations(NOTES)).toEqual([])
  })

  it('cascadeRelations 只含標示 cascade 的關聯', () => {
    expect(cascadeRelations(CHILDREN).map(relation => relation.column)).toEqual(['child'])
    expect(cascadeRelations(PARENTS).map(relation => relation.childTable)).toEqual([CHILDREN])
  })

  it('emptyParentRelations 為此表指向父表且標示 onEmpty 的關聯', () => {
    expect(emptyParentRelations(CHILDREN).map(relation => relation.parentTable)).toEqual([PARENTS])
    expect(emptyParentRelations(NOTES)).toEqual([])
  })
})
