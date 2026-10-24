import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

export interface AppBarTabs {
  tabs: string[]
  // 頁面的 v-model，由 AppShell 直接修改
  current: Ref<string>
}

export const appBarTabsKey: InjectionKey<SlotSetter<AppBarTabs | null>> = Symbol('appBarTabs')

// 目前選取的頁籤，由 AppShell 提供。沒有頁籤的畫面為 null
export const currentTabKey: InjectionKey<Readonly<Ref<string | null>>> = Symbol('currentTab')

const NO_TAB: Readonly<Ref<string | null>> = shallowRef(null)

// 頁籤列置於 App Bar 下方（extension），不隨內容捲動。由 TabPage 登記，頁面不直接使用
export function useAppBarTabs (source: () => AppBarTabs): void {
  registerSlot(appBarTabsKey, source, null)
}

// 使用者切換頁籤的訊號。頁面與面板皆位於 AppShell 之下，因此讀取同一個值
export function useCurrentTab (): Readonly<Ref<string | null>> {
  return inject(currentTabKey, NO_TAB)
}
