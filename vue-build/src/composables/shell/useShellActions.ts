import type { PageAction } from '@/composables/actions/useTableActions'
import type { ActionSlotSetter, SlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey } from 'vue'
import { registerActions, registerSlot } from '@/composables/shell/useActionSlot'

// AppShell 上放置動作的位置。登記的內容隨頁面建立與移除（見 useActionSlot）

export const appBarActionsKey: InjectionKey<ActionSlotSetter> = Symbol('appBarActions')

// App Bar 右側的動作。數量超過兩個時，AppShell 自動收為下拉選單
export function useAppBarActions (source: () => (PageAction | null)[]): void {
  registerActions(appBarActionsKey, source)
}

export const bottomActionsKey: InjectionKey<ActionSlotSetter> = Symbol('bottomActions')

// 螢幕最底端的動作列。註冊後暫時取代導覽列，離開頁面時自動還原
export function useBottomActions (source: () => (PageAction | null)[]): void {
  registerActions(bottomActionsKey, source)
}

export interface AppBarHeading {
  title: string
  back: () => void
}

export const appBarHeadingKey: InjectionKey<SlotSetter<AppBarHeading | null>> = Symbol('appBarHeading')

// 暫時以 ← 與指定的標題取代 App Bar 左側，按下 ← 時呼叫 back（例如展開 dashboard 的面板時）
export function useAppBarHeading (source: () => AppBarHeading | null): void {
  registerSlot(appBarHeadingKey, source, null)
}

export const appBarSelectionKey: InjectionKey<SlotSetter<(() => void) | null>> = Symbol('appBarSelection')

// 多選模式的出口，不為 null 時頁面正在多選。由 useMultiSelect 登記，按鈕由 AppShell 顯示
export function useAppBarSelection (source: () => (() => void) | null): void {
  registerSlot(appBarSelectionKey, source, null)
}
