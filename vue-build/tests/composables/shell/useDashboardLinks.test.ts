import type { DashboardLinks, LinksState } from '@/composables/shell/useDashboardLinks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let links: DashboardLinks
let state: LinksState
let warn: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  await freshBackend()
  const store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(NOTES)
  const { linksState, useDashboardLinks } = await import('@/composables/shell/useDashboardLinks')
  links = useDashboardLinks()
  state = linksState(links)
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('selectionOf', () => {
  it('沒有選取時，預設為沒有列，all 為沒有條件', () => {
    state.show('a', PARENTS, ['P-0001', 'P-0002'])
    expect(links.selectionOf('a').ids).toEqual([])
    expect(links.selectionOf('a', 'all').ids).toBeNull()
  })

  it('選取時為該列，並標示來源的面板', () => {
    state.show('a', PARENTS, ['P-0001', 'P-0002'])
    state.select('a', 'P-0002')
    expect(links.selectionOf('a')).toMatchObject({ table: PARENTS, ids: ['P-0002'], from: 'a' })
  })

  it('列出的列不含選取的列時，自動取消選取', () => {
    state.show('a', PARENTS, ['P-0001', 'P-0002'])
    state.select('a', 'P-0002')
    state.show('a', PARENTS, ['P-0001'])
    expect(state.output('a')?.selected).toBeNull()
  })

  it('記錄被讀取的面板名稱', () => {
    links.selectionOf('a')
    links.shownOf('b')
    expect([...state.referenced()]).toEqual(['a', 'b'])
  })
})

describe('shownOf', () => {
  it('面板尚未列出時沒有列，之後依列出的順序', () => {
    expect(links.shownOf('a')).toMatchObject({ table: null, ids: [] })
    state.show('a', CHILDREN, ['C-0003', 'C-0001'])
    expect(links.shownOf('a')).toMatchObject({ table: CHILDREN, ids: ['C-0003', 'C-0001'] })
  })

  it('列出的列不變時，不改變先後的順序', () => {
    state.show('a', CHILDREN, ['C-0001'])
    const at = links.shownOf('a').at
    state.show('a', CHILDREN, ['C-0001'])
    expect(links.shownOf('a').at).toBe(at)
  })
})

describe('表名', () => {
  it('表名為整張表', () => {
    expect(links.and(NOTES).ids).toEqual(['N-0001', 'N-0002', 'N-0003'])
  })

  it('不是表名時沒有列，並警告', () => {
    expect(links.and('missing' as typeof NOTES)).toMatchObject({ table: null, ids: [] })
    expect(warn).toHaveBeenCalled()
  })
})

describe('parentOf', () => {
  it('來源的列以 column 指向的父列，不重複', () => {
    state.show('a', CHILDREN, ['C-0006', 'C-0007', 'C-0001'])
    expect(links.parentOf(links.shownOf('a'), 'parent')).toMatchObject({ table: PARENTS, ids: ['P-0001', 'P-0006'] })
  })

  it('ref 為空的列沒有父列', () => {
    expect(links.parentOf(NOTES, 'related')).toMatchObject({ table: CHILDREN, ids: ['C-0001'] })
  })

  it('來源沒有條件時，結果也沒有條件', () => {
    state.show('a', CHILDREN, ['C-0001'])
    expect(links.parentOf(links.selectionOf('a', 'all'), 'parent')).toMatchObject({ table: PARENTS, ids: null })
  })

  it('column 不是 ref 欄位時沒有列，並警告', () => {
    expect(links.parentOf(CHILDREN, 'name')).toMatchObject({ table: null, ids: [] })
    expect(warn).toHaveBeenCalled()
  })
})

describe('childrenOf', () => {
  it('within 中指向來源的列，依 within 的順序', () => {
    state.show('a', CHILDREN, ['C-0007', 'C-0001', 'C-0006'])
    const source = { table: PARENTS, ids: ['P-0006'], from: null, at: 0 }
    expect(links.childrenOf(source, 'parent', { within: links.shownOf('a') })).toMatchObject({ table: CHILDREN, ids: ['C-0007', 'C-0006'] })
  })

  it('來源沒有條件時為 within 本身', () => {
    state.show('a', PARENTS, ['P-0001'])
    expect(links.childrenOf(links.selectionOf('a', 'all'), 'parent', { within: CHILDREN }).ids).toHaveLength(8)
  })

  it('未指定 within 時，由收到的面板以自己的表算出', () => {
    state.show('a', PARENTS, ['P-0006'])
    state.select('a', 'P-0006')
    const pending = links.childrenOf(links.selectionOf('a'), 'parent')
    expect(pending.ids).toBeNull()
    expect(pending.resolve?.(CHILDREN)).toMatchObject({ table: CHILDREN, ids: ['C-0006', 'C-0007'] })
  })

  it('未指定 within 的結果不能再作為來源，並警告', () => {
    const pending = links.childrenOf(PARENTS, 'parent')
    expect(links.parentOf(pending, 'parent')).toMatchObject({ table: null, ids: [] })
    expect(warn).toHaveBeenCalled()
  })

  it('合併的小工具保留等待的值，由面板補上', () => {
    state.show('a', PARENTS, ['P-0006'])
    state.select('a', 'P-0006')
    const combined = links.and(links.childrenOf(links.selectionOf('a'), 'parent'), { table: CHILDREN, ids: ['C-0007', 'C-0001'], from: null, at: 0 })
    expect(combined.resolve?.(CHILDREN).ids).toEqual(['C-0007'])
  })
})

describe('and、or', () => {
  const x = { table: CHILDREN, ids: ['C-0001', 'C-0002', 'C-0003'], from: null, at: 1 }
  const y = { table: CHILDREN, ids: ['C-0003', 'C-0001'], from: null, at: 2 }
  const none = { table: CHILDREN, ids: null, from: null, at: 3 }
  const empty = { table: CHILDREN, ids: [], from: null, at: 4 }

  it('and 為每一個都有的列，依第一個的順序', () => {
    expect(links.and(x, y).ids).toEqual(['C-0001', 'C-0003'])
  })

  it('and 略過沒有條件的值，全部沒有條件時沒有條件', () => {
    expect(links.and(x, none).ids).toEqual(x.ids)
    expect(links.and(none, none).ids).toBeNull()
  })

  it('or 為任一個有的列，不重複', () => {
    expect(links.or(y, x).ids).toEqual(['C-0003', 'C-0001', 'C-0002'])
  })

  it('or 中任一個沒有條件時沒有條件', () => {
    expect(links.or(x, none).ids).toBeNull()
  })

  it('沒有條件與沒有列不同', () => {
    expect(links.and(x, empty).ids).toEqual([])
    expect(links.or(x, empty).ids).toEqual(x.ids)
  })

  it('at 取最後改變的', () => {
    expect(links.and(x, y).at).toBe(2)
  })

  it('不同表時警告', () => {
    links.and(x, { table: PARENTS, ids: [], from: null, at: 0 })
    expect(warn).toHaveBeenCalled()
  })
})

describe('pickLatest、pickFirst', () => {
  it('pickLatest 為有列的值中最後改變的一個', () => {
    state.show('a', CHILDREN, ['C-0001'])
    state.show('b', CHILDREN, ['C-0002'])
    state.select('b', 'C-0002')
    state.select('a', 'C-0001')
    expect(links.pickLatest(links.selectionOf('a'), links.selectionOf('b')).ids).toEqual(['C-0001'])
    state.select('a', null)
    expect(links.pickLatest(links.selectionOf('a'), links.selectionOf('b')).ids).toEqual(['C-0002'])
  })

  it('pickLatest 都沒有列時為最後改變的一個', () => {
    const older = { table: CHILDREN, ids: [], from: 'a', at: 1 }
    const newer = { table: CHILDREN, ids: null, from: 'b', at: 2 }
    expect(links.pickLatest(older, newer)).toBe(newer)
  })

  it('pickFirst 為依順序第一個有列的值，都沒有列時為最後一個', () => {
    const empty = { table: CHILDREN, ids: [], from: null, at: 2 }
    const filled = { table: CHILDREN, ids: ['C-0001'], from: null, at: 1 }
    const none = { table: CHILDREN, ids: null, from: null, at: 3 }
    expect(links.pickFirst(empty, filled)).toBe(filled)
    expect(links.pickFirst(empty, none)).toBe(none)
  })
})

describe('not', () => {
  it('同一張表中不在來源的列', () => {
    expect(links.not({ table: NOTES, ids: ['N-0002'], from: null, at: 0 }).ids).toEqual(['N-0001', 'N-0003'])
  })

  it('來源沒有條件時沒有列', () => {
    expect(links.not({ table: NOTES, ids: null, from: null, at: 0 }).ids).toEqual([])
  })

  it('來源沒有列且表不明時沒有條件', () => {
    expect(links.not({ table: null, ids: [], from: null, at: 0 }).ids).toBeNull()
  })
})

describe('與 store 連動', () => {
  it('表名的列隨快取改變', async () => {
    const { useTablesStore } = await import('@/stores/tables')
    useTablesStore().remove(NOTES, 'N-0001')
    expect(links.and(NOTES).ids).toEqual(['N-0002', 'N-0003'])
  })
})
