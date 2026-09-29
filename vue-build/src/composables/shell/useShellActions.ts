import type { PageAction } from '@/composables/actions/useTableActions'
import type { ActionSlotSetter, SlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey } from 'vue'
import { registerActions, registerSlot } from '@/composables/shell/useActionSlot'

// AppShell 上放動作的幾個位置。登記的東西跟著頁面生滅（見 useActionSlot）

export const appBarActionsKey: InjectionKey<ActionSlotSetter> = Symbol('appBarActions')

// App Bar 右側的動作。數量多的話 AppShell 會自動收成下拉選單，這裡不用管
export function useAppBarActions (source: () => PageAction[]): void {
  registerActions(appBarActionsKey, source)
}

export const bottomActionsKey: InjectionKey<ActionSlotSetter> = Symbol('bottomActions')

// 螢幕最底端的動作列。註冊了就暫時取代導覽列，離開頁面自動還原
export function useBottomActions (source: () => PageAction[]): void {
  registerActions(bottomActionsKey, source)
}

export const appBarSelectionKey: InjectionKey<SlotSetter<(() => void) | null>> = Symbol('appBarSelection')

// 多選模式的出口：給「怎麼退出」，不是 null 就代表現在在多選。按鈕長怎樣由 AppShell 決定（跟放大鏡一樣），
// 它會釘在下拉選單外面——收進去就沒有明顯的出口了——並且讓搜尋鈕先讓位。頁面不用自己叫，useMultiSelect 會登記
export function useAppBarSelection (source: () => (() => void) | null): void {
  registerSlot(appBarSelectionKey, source, null)
}
