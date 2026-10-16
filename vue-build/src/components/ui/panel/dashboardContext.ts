import type { PanelPlacement } from './placePanels'
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
  // 手機自動排版時依內容量得的格數（最多 8 格），尚未量得時為 null
  measuredRows: Ref<number | null>
  // 面板中正在多選；多選期間關注點不移動
  selecting: Ref<boolean>
}

// DashboardPage 提供給面板的部分
export interface DashboardContext {
  focused: Readonly<Ref<string | null>>
  focus: (name: string) => void
  // 已展開的面板，其餘面板隱藏
  expanded: Readonly<Ref<string | null>>
  expand: (name: string) => void
  register: (entry: DashboardPanelEntry) => () => void
  placement: (name: string) => ComputedRef<PanelPlacement | undefined>
  // 一格的邊長（px），換算手機自動排版的格數用
  cellSize: Readonly<Ref<number>>
  gap: number
  // 面板內的轉場進行中：fade 時各面板各自命名，slide 時只有展開的面板命名（見 DashboardPage）
  panelTransition: Readonly<Ref<'fade' | 'slide' | null>>
}

export const dashboardKey: InjectionKey<DashboardContext> = Symbol('dashboard')

// 手機自動排版的高度上限
export const AUTO_ROWS_MAX = 8
