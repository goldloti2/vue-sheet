import type { PageAction } from '@/composables/actions/useTableActions'
import type { ActionSlotSetter } from '@/composables/useActionSlot'
import type { InjectionKey } from 'vue'
import { registerActions } from '@/composables/useActionSlot'

export const bottomActionsKey: InjectionKey<ActionSlotSetter> = Symbol('bottomActions')

// 螢幕最底端的動作列。註冊了就暫時取代導覽列，離開頁面自動還原。
export function useBottomActions (source: () => PageAction[]): void {
  registerActions(bottomActionsKey, source)
}
