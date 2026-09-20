import type { SlotSetter } from '@/composables/useActionSlot'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/useActionSlot'

export interface AppBarSearch {
  query: Ref<string>
  // 給了就在搜尋欄右側多一顆篩選鈕
  onFilter?: () => void
}

export const appBarSearchKey: InjectionKey<SlotSetter<AppBarSearch | null>> = Symbol('appBarSearch')

// 頁面登記後 App Bar 才出現放大鏡；query 是頁面的，AppShell 只負責讓使用者打字進去
export function useAppBarSearch (query: Ref<string>, options: { onFilter?: () => void } = {}): void {
  registerSlot(appBarSearchKey, () => ({ query, onFilter: options.onFilter }), null)
}
