import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

export type PanelActive = Readonly<Ref<boolean>>

// TabView 的每個面板各 provide 一份「我是不是當前頁籤」，由 TabViewPanel 給（provide 以元件為單位）
export const panelActiveKey: InjectionKey<PanelActive> = Symbol('panelActive')

// 不在頁籤裡的頁面永遠算當前，共用同一個常數就好
const ALWAYS_ACTIVE: PanelActive = shallowRef(true)

// 面板一旦被看過就會一直掛著（v-window 用 v-show 切），所以動作層要靠這個訊號分辨誰才算活著
export function usePanelActive (): PanelActive {
  return inject(panelActiveKey, ALWAYS_ACTIVE)
}
