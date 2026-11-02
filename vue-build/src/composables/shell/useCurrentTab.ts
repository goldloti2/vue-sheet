import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

// 目前選取的頁籤，由 TabPage provide。不在 TabPage 中時為 null
export const currentTabKey: InjectionKey<Readonly<Ref<string | null>>> = Symbol('currentTab')

const NO_TAB: Readonly<Ref<string | null>> = shallowRef(null)

// 使用者切換頁籤的訊號，讀取最近一層 TabPage 的值
export function useCurrentTab (): Readonly<Ref<string | null>> {
  return inject(currentTabKey, NO_TAB)
}
