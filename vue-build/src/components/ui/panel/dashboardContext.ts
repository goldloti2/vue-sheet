import type { PanelPlacement } from './placePanels'
import type { LinksState } from '@/composables/shell/useDashboardLinks'
import type { ListControls } from '@/composables/shell/useListControls'
import type { TableKey } from '@/schema'
import type { ComputedRef, InjectionKey, Ref } from 'vue'

// DashboardPanel 向 DashboardPage 登記的資訊
export interface DashboardPanelEntry {
  name: string
  // 小外殼上的標題，展開時改顯示於 App Bar
  title: string
  // 有小外殼才能成為關注點
  framed: boolean
  table?: TableKey
  // 各自接線的頁籤名稱。沒有設 tabs 時為 null
  tabs: () => readonly string[] | null
  // 手機自動排版時依內容量得的格數（最多 AUTO_ROWS_MAX），尚未量得時為 null
  measuredRows: Ref<number | null>
  // 面板內容登記的多選出口，不為 null 時正在多選。多選期間關注點不移動
  selection: Readonly<Ref<(() => void) | null>>
  // 面板內容自己登記的搜尋、篩選與排序（例如面板中的 TabPage）。沒有時為 null
  controls: Readonly<Ref<ListControls | null>>
}

export interface PanelEdges {
  start: boolean
  end: boolean
}

// DashboardPage 提供給面板的部分
export interface DashboardContext {
  focused: Readonly<Ref<string | null>>
  focus: (name: string) => void
  // 正在多選的面板。其他面板於此期間鎖定
  selecting: Readonly<Ref<string | null>>
  // 已展開的面板，其餘面板隱藏
  expanded: Readonly<Ref<string | null>>
  expand: (name: string) => void
  register: (entry: DashboardPanelEntry) => () => void
  placement: (name: string) => ComputedRef<PanelPlacement | undefined>
  // 手機上面板貼齊螢幕的左右兩側，該側沒有邊線。電腦上皆為 false
  edges: (name: string) => ComputedRef<PanelEdges>
  // 一格的邊長（px），用於換算手機自動排版的格數
  cellSize: Readonly<Ref<number>>
  gap: number
  // 面板內的轉場進行中：fade 時各面板各自命名，slide 時只有展開的面板命名（見 DashboardPage）
  panelTransition: Readonly<Ref<'fade' | 'slide' | null>>
  // 選取改變時的轉場：fade 用於點擊，forward 與 back 用於上一列、下一列
  transition: (kind: 'fade' | 'forward' | 'back', update: () => void) => void
  // 各面板的輸出
  links: LinksState
}

export const dashboardKey: InjectionKey<DashboardContext> = Symbol('dashboard')

// 方格的尺寸見 docs/design/dashboard.md
// 手機自動排版的高度上限
export const AUTO_ROWS_MAX = 16

// 格子的間隔（px）
export const GAP = 8
// 寬的格數
export const COLS = { mobile: 12, desktop: 48 }
