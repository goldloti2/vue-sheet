import type { TableKey } from '@/schema'
import type { InjectionKey } from 'vue'
import { inject, reactive, shallowReactive } from 'vue'
import { schemas } from '@/schema'
import { findColumn } from '@/schema/types'
import { useTablesStore } from '@/stores/tables'

type RowTest = (row: object) => boolean

// 小工具之間傳遞的值：一張表中的一組列（見 docs/components/panel/DashboardPage.md 的「連動」）
export interface Link {
  // 列所屬的表。等待面板補上時為 null
  table: TableKey | null
  // 列的主鍵。null 表示沒有條件，即全部的列
  ids: readonly string[] | null
  // 值為哪個面板的選取。其他的值為 null
  from: string | null
  // 來源最後改變的順序，pickLatest 依此比較
  at: number
  // 等待面板補上表的值（未指定 within 的 childrenOf）：由收到的面板以自己的表算出列
  resolve?: (table: TableKey) => Link
}

// 小工具的來源：表名表示整張表
export type LinkSource = TableKey | Link

// 頁面接線所用的小工具
export interface DashboardLinks {
  // 面板中選取的那一列。沒有選取時，notSelected 為 'all' 即沒有條件，為 'none'（預設）即沒有列
  selectionOf: (panel: string, notSelected?: 'all' | 'none') => Link
  // 面板中列出的列，依顯示的順序。面板尚未列出時沒有列
  shownOf: (panel: string) => Link
  // 來源的列以 column 指向的父列
  parentOf: (source: LinkSource, column: string) => Link
  // within 中以 column 指向來源的列。未指定 within 時為收到的面板的整張表
  childrenOf: (source: LinkSource, column: string, options?: { within?: LinkSource }) => Link
  // 每一個都有的列。略過沒有條件的
  and: (first: LinkSource, ...rest: LinkSource[]) => Link
  // 任一個有的列。任一個沒有條件時沒有條件
  or: (first: LinkSource, ...rest: LinkSource[]) => Link
  // 有列的來源中最後改變的一個。都沒有列時為全部中最後改變的一個
  pickLatest: (first: LinkSource, ...rest: LinkSource[]) => Link
  // 依順序第一個有列的來源。都沒有列時為最後一個
  pickFirst: (first: LinkSource, ...rest: LinkSource[]) => Link
  // 同一張表中不在來源的列
  not: (source: LinkSource) => Link
}

// 面板的輸出：選取由 ListPage 寫入，列出的列由 ListPage、ChartPage 與 DetailPage 寫入
export interface PanelOutput {
  table: TableKey | null
  selected: string | null
  shown: readonly string[] | null
  selectedAt: number
  shownAt: number
}

// DashboardPage 與 DashboardPanel 使用的部分，頁面不使用
export interface LinksState {
  output: (panel: string) => PanelOutput | undefined
  select: (panel: string, id: string | null) => void
  // 選取的列不在其中時，自動取消選取
  show: (panel: string, table: TableKey, ids: readonly string[]) => void
  // selectionOf 與 shownOf 用到的面板名稱
  referenced: () => ReadonlySet<string>
}

const states = new WeakMap<DashboardLinks, LinksState>()

// 所有連動中心共用的順序，只用於比較先後
let clock = 0

// 同一輪中一個面板列出的列改變幾次即警告
const CYCLE_LIMIT = 10

function sameIds (a: readonly string[] | null, b: readonly string[]): boolean {
  return a !== null && a.length === b.length && a.every((id, index) => id === b[index])
}

// 每次呼叫建立一份新的連動中心。頁面以 DashboardPage 的 links prop 交給自己的 dashboard
export function useDashboardLinks (): DashboardLinks {
  const store = useTablesStore()
  const outputs = shallowReactive(new Map<string, PanelOutput>())

  function ensure (panel: string): PanelOutput {
    let output = outputs.get(panel)
    if (!output) {
      output = reactive({ table: null, selected: null, shown: null, selectedAt: 0, shownAt: 0 })
      outputs.set(panel, output)
    }
    return output
  }

  function select (panel: string, id: string | null) {
    const output = ensure(panel)
    if (output.selected !== id) {
      output.selected = id
      output.selectedAt = ++clock
    }
  }

  // 開發模式：同一輪中列出的列反覆改變時，shownOf 的接線可能形成循環
  const bursts = new Map<string, number>()
  function checkCycle (panel: string) {
    if (bursts.size === 0) {
      setTimeout(() => bursts.clear())
    }
    const count = (bursts.get(panel) ?? 0) + 1
    bursts.set(panel, count)
    if (count === CYCLE_LIMIT) {
      console.warn(`[useDashboardLinks] 面板 ${panel} 列出的列在同一輪中改變了 ${CYCLE_LIMIT} 次，shownOf 的接線可能形成循環`)
    }
  }

  function show (panel: string, table: TableKey, ids: readonly string[]) {
    const output = ensure(panel)
    if (output.table !== table || !sameIds(output.shown, ids)) {
      output.table = table
      output.shown = [...ids]
      output.shownAt = ++clock
      if (import.meta.env.DEV) {
        checkCycle(panel)
      }
    }
    if (output.selected && !ids.includes(output.selected)) {
      select(panel, null)
    }
  }

  const referenced = new Set<string>()

  function selectionOf (panel: string, notSelected: 'all' | 'none' = 'none'): Link {
    referenced.add(panel)
    const output = outputs.get(panel)
    const id = output?.selected
    const ids = id ? [id] : (notSelected === 'all' ? null : [])
    return { table: output?.table ?? null, ids, from: panel, at: output?.selectedAt ?? 0 }
  }

  function shownOf (panel: string): Link {
    referenced.add(panel)
    const output = outputs.get(panel)
    return { table: output?.table ?? null, ids: output?.shown ?? [], from: null, at: output?.shownAt ?? 0 }
  }

  function rowsOf (table: TableKey): Record<string, unknown>[] {
    return (store.rows[table] ?? []) as Record<string, unknown>[]
  }

  function idsOf (table: TableKey): string[] {
    return rowsOf(table).map(row => row.id as string)
  }

  // 表名為整張表。表尚未載入時沒有列
  function resolve (source: LinkSource): Link {
    if (typeof source !== 'string') {
      return source
    }
    if (!(source in schemas)) {
      if (import.meta.env.DEV) {
        console.warn(`[useDashboardLinks] ${source} 不是表名。面板的值以 selectionOf 或 shownOf 取得`)
      }
      return { table: null, ids: [], from: null, at: 0 }
    }
    return { table: source, ids: idsOf(source), from: null, at: 0 }
  }

  // 等待面板補上表的值，只能交給面板與合併的小工具
  function settled (source: LinkSource, helper: string): Link {
    const link = resolve(source)
    if (!link.resolve) {
      return link
    }
    if (import.meta.env.DEV) {
      console.warn(`[useDashboardLinks] ${helper}：未指定 within 的 childrenOf 不能作為來源`)
    }
    return { table: null, ids: [], from: null, at: link.at }
  }

  // 任一個值等待面板補上表時，結果也等待，由面板以同一張表補上每一個值
  function combine (sources: LinkSource[], build: (links: Link[]) => Link): Link {
    const links = sources.map(source => resolve(source))
    if (!links.some(link => link.resolve)) {
      return build(links)
    }
    return {
      table: null,
      ids: null,
      from: null,
      at: Math.max(...links.map(link => link.at)),
      resolve: table => build(links.map(link => link.resolve?.(table) ?? link)),
    }
  }

  function sameTable (links: Link[], helper: string): TableKey | null {
    const table = links.find(link => link.table)?.table ?? null
    if (import.meta.env.DEV && links.some(link => link.table && link.table !== table)) {
      console.warn(`[useDashboardLinks] ${helper}：各值須為同一張表`)
    }
    return table
  }

  // 沒有條件的來源，結果也沒有條件
  function parentOf (source: LinkSource, column: string): Link {
    const link = settled(source, 'parentOf')
    const definition = link.table ? findColumn(schemas[link.table], column) : undefined
    if (import.meta.env.DEV && link.table && definition?.type !== 'ref') {
      console.warn(`[useDashboardLinks] parentOf：${column} 不是 ${link.table} 的 ref 欄位`)
    }
    const table = definition?.type === 'ref' ? definition.refTable as TableKey : null
    if (link.ids === null) {
      return { table, ids: null, from: null, at: link.at }
    }
    if (!link.table || !table) {
      return { table, ids: [], from: null, at: link.at }
    }

    const wanted = new Set(link.ids)
    const parents = new Set<string>()
    for (const row of rowsOf(link.table)) {
      const value = row[column]
      if (wanted.has(row.id as string) && typeof value === 'string' && value) {
        parents.add(value)
      }
    }
    return { table, ids: [...parents], from: null, at: link.at }
  }

  // 依 within 的順序。來源沒有條件時為 within 本身，否則排除 ref 為空的列
  function children (link: Link, column: string, within: Link): Link {
    const table = within.table
    const at = Math.max(link.at, within.at)
    if (link.ids === null) {
      return { table, ids: within.ids, from: null, at }
    }
    if (!table) {
      return { table, ids: [], from: null, at }
    }
    const definition = findColumn(schemas[table], column)
    if (import.meta.env.DEV && (definition?.type !== 'ref' || (link.table && definition.refTable !== link.table))) {
      console.warn(`[useDashboardLinks] childrenOf：${column} 不是 ${table} 指向 ${link.table} 的 ref 欄位`)
    }

    const wanted = new Set(link.ids)
    const refs = new Map(rowsOf(table).map(row => [row.id as string, row[column]]))
    const pool = within.ids ?? idsOf(table)
    return { table, ids: pool.filter(id => wanted.has(refs.get(id) as string)), from: null, at }
  }

  function childrenOf (source: LinkSource, column: string, { within }: { within?: LinkSource } = {}): Link {
    const link = settled(source, 'childrenOf')
    if (within === undefined) {
      return { table: null, ids: null, from: null, at: link.at, resolve: table => children(link, column, { table, ids: null, from: null, at: 0 }) }
    }
    return combine([within], ([pool]) => children(link, column, pool!))
  }

  function and (...sources: [LinkSource, ...LinkSource[]]): Link {
    return combine(sources, links => {
      const table = sameTable(links, 'and')
      const at = Math.max(...links.map(link => link.at))
      const [first, ...rest] = links.flatMap(link => link.ids ? [link.ids] : [])
      if (!first) {
        return { table, ids: null, from: null, at }
      }
      const sets = rest.map(ids => new Set(ids))
      return { table, ids: first.filter(id => sets.every(set => set.has(id))), from: null, at }
    })
  }

  function or (...sources: [LinkSource, ...LinkSource[]]): Link {
    return combine(sources, links => {
      const table = sameTable(links, 'or')
      const at = Math.max(...links.map(link => link.at))
      if (links.some(link => link.ids === null)) {
        return { table, ids: null, from: null, at }
      }
      return { table, ids: [...new Set(links.flatMap(link => link.ids ?? []))], from: null, at }
    })
  }

  function hasRows (link: Link): boolean {
    return !!link.ids && link.ids.length > 0
  }

  function pickLatest (...sources: [LinkSource, ...LinkSource[]]): Link {
    return combine(sources, links => {
      sameTable(links, 'pickLatest')
      const filled = links.filter(link => hasRows(link))
      return (filled.length > 0 ? filled : links).reduce((newest, link) => link.at > newest.at ? link : newest)
    })
  }

  function pickFirst (...sources: [LinkSource, ...LinkSource[]]): Link {
    return combine(sources, links => {
      sameTable(links, 'pickFirst')
      return links.find(link => hasRows(link)) ?? links.at(-1)!
    })
  }

  // 沒有條件時沒有列。來源沒有列且表不明時沒有條件
  function not (source: LinkSource): Link {
    return combine([source], ([link]) => {
      const { table, at } = link!
      if (link!.ids === null) {
        return { table, ids: [], from: null, at }
      }
      if (!table) {
        return { table, ids: null, from: null, at }
      }
      const excluded = new Set(link!.ids)
      return { table, ids: idsOf(table).filter(id => !excluded.has(id)), from: null, at }
    })
  }

  const links: DashboardLinks = { selectionOf, shownOf, parentOf, childrenOf, and, or, pickLatest, pickFirst, not }
  states.set(links, { output: panel => outputs.get(panel), select, show, referenced: () => referenced })
  return links
}

// DashboardPage 取得連動中心的內部狀態
export function linksState (links: DashboardLinks): LinksState {
  const state = states.get(links)
  if (!state) {
    throw new Error('links 須由 useDashboardLinks() 建立')
  }
  return state
}

// DashboardPanel 提供給內容：面板的輸入，以及寫入輸出的方式（見 docs/components/panel/DashboardPanel.md）
export interface DashboardPanelContext {
  // 加入 dashboard 共用的搜尋、篩選與排序
  shared: () => boolean
  // 點擊一列為選取
  selects: () => boolean
  selected: () => string | null
  // 點擊一列：選取，已選取的那一列再點一次即取消
  toggle: (id: string) => void
  // ListPage、ChartPage 與 DetailPage 寫入列出的列
  show: (table: TableKey, ids: readonly string[]) => void
  // 列表的輸入，與 useListPage 的 scope 同一步
  scope: () => RowTest | null
  // 列表中以另一種顏色標示的列
  marked: (id: string) => boolean
  // 詳細頁的輸入：scope 剛好一列時為這一列，否則為空字串
  recordId: () => string
  // 詳細頁的上一列與下一列所依的順序：值為列表的選取時，為該列表列出的列。推導出的值為 null
  recordOrder: () => readonly string[] | null
  // 切換詳細頁顯示的列：移動來源列表的選取
  goRecord: (id: string, direction: 'forward' | 'back') => void
  // 頁籤自己的接線，由 TabPanel 取得。面板的 tabs 中沒有該頁籤時為 null
  forTab: (tab: string) => DashboardPanelContext | null
}

export const dashboardPanelKey: InjectionKey<DashboardPanelContext> = Symbol('dashboardPanel')

// 不在 dashboard 的面板中時為 null
export function useDashboardPanel (): DashboardPanelContext | null {
  return inject(dashboardPanelKey, null)
}
