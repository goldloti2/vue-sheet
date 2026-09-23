import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

export interface AppBarTabs {
  tabs: string[]
  // 頁面的 v-model，AppShell 直接改它
  current: Ref<string>
}

export const appBarTabsKey: InjectionKey<SlotSetter<AppBarTabs | null>> = Symbol('appBarTabs')

// 頁籤列掛在 App Bar 底下（extension），不跟著內容捲動。頁面不直接用，由 TabView 登記
export function useAppBarTabs (source: () => AppBarTabs): void {
  registerSlot(appBarTabsKey, source, null)
}
