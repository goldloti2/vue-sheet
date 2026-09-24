import type { Filters } from '@/composables/data/useFilter'
import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { TableSchema } from '@/schema/types'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

// 一張表的篩選條件。rows 是還沒過濾的整表，select 只列裡面出現過的值
export interface SearchTable {
  schema: TableSchema
  filters: Ref<Filters>
  rows: Ref<readonly object[]>
}

export interface AppBarSearch {
  query: Ref<string>
  // 給了就在搜尋欄右側多一顆篩選鈕，開右側抽屜
  filter?: {
    // 每張表各自一份條件、同時生效。單表的頁面給一個元素就好
    tables: SearchTable[]
    // 頁面的頁籤（值對得上某張表的 sheetName），抽屜打開時先停在那張表
    current?: Ref<string>
  }
}

export const appBarSearchKey: InjectionKey<SlotSetter<AppBarSearch | null>> = Symbol('appBarSearch')

// 頁面登記後 App Bar 才出現放大鏡；query / filters 都是頁面的，AppShell 只負責讓使用者改它們
export function useAppBarSearch (query: Ref<string>, filter?: AppBarSearch['filter']): void {
  registerSlot(appBarSearchKey, () => ({ query, filter }), null)
}
