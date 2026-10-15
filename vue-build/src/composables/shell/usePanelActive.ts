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

// DashboardPanel 提供：面板中的 FAB 是否可掛出（dashboard 中僅於展開時）。不在面板中時永遠可以
export const panelFabKey: InjectionKey<PanelActive> = Symbol('panelFab')

export function usePanelFab (): PanelActive {
  return inject(panelFabKey, ALWAYS_ACTIVE)
}
