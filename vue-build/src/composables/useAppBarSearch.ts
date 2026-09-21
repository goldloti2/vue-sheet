import type { SlotSetter } from '@/composables/useActionSlot'
import type { Filters } from '@/composables/useFilter'
import type { TableSchema } from '@/schema/types'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/useActionSlot'

export interface AppBarSearch {
  query: Ref<string>
  // 給了就在搜尋欄右側多一顆篩選鈕，開右側抽屜。rows 是還沒過濾的整表，select 只列裡面出現過的值
  filter?: { schema: TableSchema, filters: Ref<Filters>, rows: Ref<readonly object[]> }
}

export const appBarSearchKey: InjectionKey<SlotSetter<AppBarSearch | null>> = Symbol('appBarSearch')

// 頁面登記後 App Bar 才出現放大鏡；query / filters 都是頁面的，AppShell 只負責讓使用者改它們
export function useAppBarSearch (query: Ref<string>, filter?: AppBarSearch['filter']): void {
  registerSlot(appBarSearchKey, () => ({ query, filter }), null)
}
