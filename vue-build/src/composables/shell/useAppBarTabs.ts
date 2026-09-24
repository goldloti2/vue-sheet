import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

export interface AppBarTabs {
  tabs: string[]
  // 頁面的 v-model，AppShell 直接改它
  current: Ref<string>
}

export const appBarTabsKey: InjectionKey<SlotSetter<AppBarTabs | null>> = Symbol('appBarTabs')

// 目前選中的頁籤，由 AppShell 提供。沒有頁籤的畫面是 null
export const currentTabKey: InjectionKey<Readonly<Ref<string | null>>> = Symbol('currentTab')

const NO_TAB: Readonly<Ref<string | null>> = shallowRef(null)

// 頁籤列掛在 App Bar 底下（extension），不跟著內容捲動。頁面不直接用，由 TabView 登記
export function useAppBarTabs (source: () => AppBarTabs): void {
  registerSlot(appBarTabsKey, source, null)
}

// 「使用者換頁籤了」的訊號。頁面與面板都畫在 AppShell 底下，所以兩邊讀到的是同一份
export function useCurrentTab (): Readonly<Ref<string | null>> {
  return inject(currentTabKey, NO_TAB)
}
