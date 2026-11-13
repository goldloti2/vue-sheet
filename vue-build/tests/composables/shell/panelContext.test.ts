import type { PanelContextOptions } from '@/composables/shell/panelContext'
import type { DashboardLinks, DashboardPanelContext, LinksState } from '@/composables/shell/useDashboardLinks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let links: DashboardLinks
let state: LinksState
let create: (options: Partial<PanelContextOptions>) => DashboardPanelContext

beforeEach(async () => {
  await freshBackend()
  const store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(NOTES)
  const { linksState, useDashboardLinks } = await import('@/composables/shell/useDashboardLinks')
  const { createPanelContext } = await import('@/composables/shell/panelContext')
  links = useDashboardLinks()
  state = linksState(links)
  // 轉場直接套用
  create = options => createPanelContext({
    links: state,
    transition: (_kind, update) => update(),
    name: 'panel',
    wiring: () => ({}),
    shared: () => false,
    ...options,
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('輸入', () => {
  it('scope 只保留其中的列，沒有條件時不限制', () => {
    const scoped = create({ wiring: () => ({ table: PARENTS, scope: { table: PARENTS, ids: ['P-0001'], from: null, at: 0 } }) })
    expect(scoped.scope()?.({ id: 'P-0001' })).toBe(true)
    expect(scoped.scope()?.({ id: 'P-0002' })).toBe(false)
    expect(create({}).scope()).toBeNull()
  })

  it('未指定 within 的 childrenOf 以接線的表算出', () => {
    state.show('a', PARENTS, ['P-0006'])
    state.select('a', 'P-0006')
    const context = create({ wiring: () => ({ table: CHILDREN, scope: links.childrenOf(links.selectionOf('a'), 'parent') }) })
    expect(context.scope()?.({ id: 'C-0006' })).toBe(true)
    expect(context.scope()?.({ id: 'C-0001' })).toBe(false)
  })

  it('mark 標示其中的列', () => {
    const context = create({ wiring: () => ({ table: PARENTS, mark: { table: PARENTS, ids: ['P-0002'], from: null, at: 0 } }) })
    expect(context.marked('P-0002')).toBe(true)
    expect(context.marked('P-0001')).toBe(false)
  })

  it('scope 剛好一列時為詳細頁的列，並依來源列表的順序', () => {
    state.show('a', PARENTS, ['P-0002', 'P-0001'])
    state.select('a', 'P-0001')
    const context = create({ wiring: () => ({ table: PARENTS, scope: links.selectionOf('a') }) })
    expect(context.recordId()).toBe('P-0001')
    expect(context.recordOrder()).toEqual(['P-0002', 'P-0001'])
    context.goRecord('P-0002', 'back')
    expect(state.output('a')?.selected).toBe('P-0002')
  })
})

describe('輸出', () => {
  it('以 name 寫入列出的列與選取，再點一次取消選取', () => {
    const context = create({ wiring: () => ({ selects: true }) })
    context.show(PARENTS, ['P-0001', 'P-0002'])
    context.toggle('P-0002')
    expect(links.selectionOf('panel')).toMatchObject({ table: PARENTS, ids: ['P-0002'] })
    context.toggle('P-0002')
    expect(context.selected()).toBeNull()
  })
})

describe('tabs', () => {
  const pick = { table: PARENTS, ids: ['P-0001'], from: null, at: 0 }

  it('設了 tabs 時，本身沒有輸入與輸出', () => {
    const context = create({ wiring: () => ({ selects: true, scope: pick }), tabs: () => ({ first: {} }) })
    context.show(PARENTS, ['P-0001'])
    context.toggle('P-0001')
    expect(state.output('panel')).toBeUndefined()
    expect(context.selects()).toBe(false)
    expect(context.scope()).toBeNull()
  })

  it('頁籤以「面板/頁籤」各自輸出，切到其他頁籤後保留最後的值', () => {
    const context = create({ tabs: () => ({ first: { selects: true }, second: { selects: true } }) })
    const first = context.forTab('first')!
    const second = context.forTab('second')!
    first.show(PARENTS, ['P-0001', 'P-0002'])
    first.toggle('P-0002')
    second.show(CHILDREN, ['C-0001'])
    expect(links.selectionOf('panel/first')).toMatchObject({ table: PARENTS, ids: ['P-0002'] })
    expect(links.shownOf('panel/second')).toMatchObject({ table: CHILDREN, ids: ['C-0001'] })
  })

  it('頁籤使用自己的輸入，未指定 table 時沿用面板的 table', () => {
    state.show('a', PARENTS, ['P-0006'])
    state.select('a', 'P-0006')
    const scope = links.childrenOf(links.selectionOf('a'), 'parent')
    const context = create({ wiring: () => ({ table: CHILDREN }), tabs: () => ({ first: { scope }, second: {} }) })
    expect(context.forTab('first')!.scope()?.({ id: 'C-0006' })).toBe(true)
    expect(context.forTab('first')!.scope()?.({ id: 'C-0001' })).toBe(false)
    expect(context.forTab('second')!.scope()).toBeNull()
  })

  it('tabs 中沒有的頁籤，以及沒有設 tabs 時為 null', () => {
    expect(create({ tabs: () => ({ first: {} }) }).forTab('other')).toBeNull()
    expect(create({}).forTab('first')).toBeNull()
  })
})
