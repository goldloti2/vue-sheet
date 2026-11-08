import type { ChildRow, NoteRow, ParentRow } from '../../fixtures/backend/schema'
import type { copyAction as CopyAction } from '@/composables/actions/useTableActions'
import type Router from '@/router'
import type { useTablesStore } from '@/stores/tables'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))
vi.mock('@/router', () => ({
  default: { push: vi.fn(), beforeEach: vi.fn(), afterEach: vi.fn() },
  leaveAfterAction: vi.fn(),
}))

let store: ReturnType<typeof useTablesStore>
let copyAction: typeof CopyAction
let router: typeof Router

beforeEach(async () => {
  await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
  copyAction = (await import('@/composables/actions/useTableActions')).copyAction
  router = (await import('@/router')).default
  await store.ensureLoaded(NOTES)
})

function childRow (id: string) {
  return (store.rows[CHILDREN] as ChildRow[]).find(row => row.id === id)!
}

describe('copyAction', () => {
  it('先確認，確認框顯示這一列的名稱', () => {
    expect(copyAction(CHILDREN, childRow('C-0001'))?.confirm?.text).toContain('物件一')
  })

  it('主鍵重新發號，其餘真實欄位照抄，並前往新的一列', async () => {
    const source = childRow('C-0001')
    const before = store.rows[CHILDREN]!.length

    await copyAction(CHILDREN, source)?.onClick()

    const rows = store.rows[CHILDREN] as ChildRow[]
    expect(rows).toHaveLength(before + 1)
    const copied = rows.at(-1)!
    expect(copied.id).not.toBe(source.id)
    expect(copied.code).toBe(copied.id)
    expect(copied).toMatchObject({ parent: source.parent, name: source.name, amount: source.amount, fee: source.fee, day: source.day, note: source.note })
    expect(router.push).toHaveBeenCalledWith(`/${CHILDREN}/${copied.id}`)
  })

  it('子列不複製', async () => {
    const source = (store.rows[PARENTS] as ParentRow[]).find(row => row.$children_parent.length > 0)!
    const before = store.rows[CHILDREN]!.length

    await copyAction(PARENTS, source)?.onClick()

    expect(store.rows[CHILDREN]).toHaveLength(before)
    expect((store.rows[PARENTS] as ParentRow[]).at(-1)?.$children_parent).toEqual([])
  })

  it('表沒有 newId 時為 null', () => {
    expect(copyAction(NOTES, (store.rows[NOTES] as NoteRow[])[0]!)).toBeNull()
  })

  it('可替換文字與圖示', () => {
    expect(copyAction(CHILDREN, childRow('C-0001'), { label: '另存', icon: 'x' })).toMatchObject({ label: '另存', icon: 'x' })
  })
})
