import type { PageAction } from '@/composables/actions/useTableActions'
import type { ActionSlotSetter } from '@/composables/shell/useActionSlot'
import type { InjectionKey } from 'vue'
import { registerActions } from '@/composables/shell/useActionSlot'

export const appBarActionsKey: InjectionKey<ActionSlotSetter> = Symbol('appBarActions')

// App Bar 右側的動作。數量多的話 AppShell 會自動收成下拉選單，這裡不用管
export function useAppBarActions (source: () => PageAction[]): void {
  registerActions(appBarActionsKey, source)
}
