import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

type PanelActive = Readonly<Ref<boolean>>

// TabPage 與 DashboardPage 的每個面板各 provide 一份「我是不是當前面板」，由 TabPanel／DashboardPanel 給（provide 以元件為單位）
export const panelActiveKey: InjectionKey<PanelActive> = Symbol('panelActive')

// 不在頁籤裡的頁面永遠算當前，共用同一個常數就好
const ALWAYS_ACTIVE: PanelActive = shallowRef(true)

// 面板一旦被看過就會一直掛著（v-window 用 v-show 切），所以動作層要靠這個訊號分辨誰才算活著
export function usePanelActive (): PanelActive {
  return inject(panelActiveKey, ALWAYS_ACTIVE)
}

// DashboardPanel 提供：面板是否以整頁呈現（dashboard 中僅於展開時）。不在面板中時永遠是。
// 只適合整頁的東西讀它：FAB、DetailPage 的上下一筆箭頭與左右滑動
export const panelFullPageKey: InjectionKey<PanelActive> = Symbol('panelFullPage')

export function usePanelFullPage (): PanelActive {
  return inject(panelFullPageKey, ALWAYS_ACTIVE)
}
