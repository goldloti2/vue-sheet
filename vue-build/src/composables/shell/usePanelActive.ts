import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

type PanelActive = Readonly<Ref<boolean>>

// 面板是否為目前面板，由 TabPanel 與 DashboardPanel 各自 provide
export const panelActiveKey: InjectionKey<PanelActive> = Symbol('panelActive')

// 不在面板中的頁面一律為目前頁面，共用同一個常數
const ALWAYS_ACTIVE: PanelActive = shallowRef(true)

// 面板顯示過後即保持掛載（v-window 以 v-show 切換），動作以此訊號判斷面板是否作用中
export function usePanelActive (): PanelActive {
  return inject(panelActiveKey, ALWAYS_ACTIVE)
}

// 面板是否以整頁呈現，由 DashboardPanel 提供。供 FAB 與上一列、下一列的導覽讀取
export const panelFullPageKey: InjectionKey<PanelActive> = Symbol('panelFullPage')

export function usePanelFullPage (): PanelActive {
  return inject(panelFullPageKey, ALWAYS_ACTIVE)
}

// 面板目前是否有外框，由 DashboardPanel 提供，展開時為 false。內容可據此省略自己的外框
export const panelBorderedKey: InjectionKey<PanelActive> = Symbol('panelBordered')

// 不在面板中時沒有外框
const NEVER_BORDERED: PanelActive = shallowRef(false)

export function usePanelBordered (): PanelActive {
  return inject(panelBorderedKey, NEVER_BORDERED)
}
