import type { ChildRow, NoteRow, ParentRow } from '../../fixtures/backend/schema'
import type * as TableActions from '@/composables/actions/useTableActions'
import type Router from '@/router'
import type { useTablesStore } from '@/stores/tables'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))
vi.mock('@/composables/shell/useAskFields', () => ({ askFields: vi.fn() }))
vi.mock('@/router', () => ({
  default: { push: vi.fn(), beforeEach: vi.fn(), afterEach: vi.fn() },
  leaveAfterAction: vi.fn(),
}))

let store: ReturnType<typeof useTablesStore>
let actions: typeof TableActions
let router: typeof Router

beforeEach(async () => {
  await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
  actions = await import('@/composables/actions/useTableActions')
  router = (await import('@/router')).default
  await store.ensureLoaded(NOTES)
})

function childRow (id: string) {
  return (store.rows[CHILDREN] as ChildRow[]).find(row => row.id === id)!
}

describe('copyAction', () => {
  it('先確認，確認框顯示這一列的名稱', () => {
    expect(actions.copyAction(CHILDREN, childRow('C-0001'))?.confirm?.text).toContain('物件一')
  })

  it('主鍵重新發號，其餘真實欄位照抄，並前往新的一列', async () => {
    const source = childRow('C-0001')
    const before = store.rows[CHILDREN]!.length

    await actions.copyAction(CHILDREN, source)?.onClick()

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

    await actions.copyAction(PARENTS, source)?.onClick()

    expect(store.rows[CHILDREN]).toHaveLength(before)
    expect((store.rows[PARENTS] as ParentRow[]).at(-1)?.$children_parent).toEqual([])
  })

  it('表沒有 newId 時為 null', () => {
    expect(actions.copyAction(NOTES, (store.rows[NOTES] as NoteRow[])[0]!)).toBeNull()
  })

  it('可替換文字與圖示', () => {
    expect(actions.copyAction(CHILDREN, childRow('C-0001'), { label: '另存', icon: 'x' })).toMatchObject({ label: '另存', icon: 'x' })
  })
})

// 列表的多選：clear 清空 selectedIds
function selectionWith (...ids: string[]) {
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set(ids))
  return { selectedIds, clear: vi.fn(() => {
    selectedIds.value = new Set()
  }) }
}

describe('bulkDeleteAction', () => {
  it('沒有 selection 或沒有選取時為 null', () => {
    expect(actions.bulkDeleteAction(CHILDREN, undefined)).toBeNull()
    expect(actions.bulkDeleteAction(CHILDREN, selectionWith())).toBeNull()
  })

  it('刪除選取的列，完成後清除選取', async () => {
    const selection = selectionWith('C-0001', 'C-0002')

    await actions.bulkDeleteAction(CHILDREN, selection)?.onClick()

    expect((store.rows[CHILDREN] as ChildRow[]).some(row => row.id === 'C-0001' || row.id === 'C-0002')).toBe(false)
    expect(selection.clear).toHaveBeenCalledOnce()
  })
})

describe('quickEditAction', () => {
  it('沒有 selection 或沒有選取時為 null', () => {
    expect(actions.quickEditAction<ChildRow>(CHILDREN, ['note'], undefined, { label: '改', icon: 'x' })).toBeNull()
    expect(actions.quickEditAction<ChildRow>(CHILDREN, ['note'], selectionWith(), { label: '改', icon: 'x' })).toBeNull()
  })
})

describe('quickEditAction 的寫入', () => {
  const edit = (selection: ReturnType<typeof selectionWith>) =>
    actions.quickEditAction<ChildRow>(CHILDREN, ['note'], selection, { label: '改', icon: 'x' })

  async function answer (values: Partial<ChildRow> | null) {
    const { askFields } = await import('@/composables/shell/useAskFields')
    vi.mocked(askFields).mockResolvedValue(values)
  }

  it('將選取的列改為同一個值，完成後清除選取', async () => {
    const selection = selectionWith('C-0001', 'C-0002')
    await answer({ note: '已改' })

    await edit(selection)?.onClick()

    expect([childRow('C-0001').note, childRow('C-0002').note]).toEqual(['已改', '已改'])
    expect(selection.clear).toHaveBeenCalledOnce()
  })

  it('取消時不寫入，保留選取', async () => {
    const selection = selectionWith('C-0001')
    const before = childRow('C-0001').note
    await answer(null)

    await edit(selection)?.onClick()

    expect(childRow('C-0001').note).toBe(before)
    expect(selection.clear).not.toHaveBeenCalled()
  })
})

describe('selectionOf', () => {
  it('只含這一列，clear 不改變選取', () => {
    const selection = actions.selectionOf({ id: 'C-0001' })
    selection.clear()

    expect([...selection.selectedIds.value]).toEqual(['C-0001'])
  })
})

describe('newDefaults', () => {
  it('列表的 match 中的真實欄位，再以 defaults 覆寫', () => {
    const list = { selection: selectionWith(), match: () => ({ parent: 'P-0001', name: '甲', status: '進行中' }) }

    expect(actions.newDefaults(CHILDREN, { list, defaults: () => ({ name: '乙' }) })).toEqual({ parent: 'P-0001', name: '乙' })
  })

  it('沒有 list 時只有 defaults', () => {
    expect(actions.newDefaults(CHILDREN, { defaults: { name: '乙' } })).toEqual({ name: '乙' })
  })
})

describe('bindActions', () => {
  const action = { key: 'x', label: 'X', icon: 'x', onClick: () => {} }
  const build = (row: { id: string }) => row.id === 'C-0001' ? { ...action, key: row.id } : null

  it('以列為參數的動作綁定至這一列，不適用時為 null，其他照原樣', () => {
    expect(actions.bindActions([action, null, build], { id: 'C-0001' })).toEqual([action, null, { ...action, key: 'C-0001' }])
    expect(actions.bindActions([build], { id: 'C-0002' })).toEqual([null])
  })

  it('尚未載入時，以列為參數的動作為 null', () => {
    expect(actions.bindActions([action, build], null)).toEqual([action, null])
  })

  it('沒有提供動作時為 undefined', () => {
    expect(actions.bindActions(undefined, { id: 'C-0001' })).toBeUndefined()
  })
})
