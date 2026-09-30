import type { Filters } from '@/composables/data/useFilter'
import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

// 抽屜裡的一張表。rows 是還沒過濾的整表，select 只列裡面出現過的值
export interface SearchTable {
  schema: TableSchema
  filters: Ref<Filters>
  rows: Ref<readonly object[]>
  // 使用者選的排序，null 就是照 schema.defaultSort。給了才有排序鈕
  sort?: Ref<SortSpec | null>
}

export interface AppBarSearch {
  query: Ref<string>
  // 給了就有篩選鈕（搜尋欄內）與排序鈕（App Bar 上），兩個都開同一個右側抽屜
  drawer?: {
    // 每張表各自一份條件與排序、同時生效。單表的頁面給一個元素就好
    tables: SearchTable[]
    // 頁面的頁籤（值對得上某張表的 sheetName），抽屜打開時先停在那張表
    current?: Ref<string>
  }
}

export const appBarSearchKey: InjectionKey<SlotSetter<AppBarSearch | null>> = Symbol('appBarSearch')

// 頁面登記後 App Bar 才出現放大鏡；query / filters / sort 都是頁面的，AppShell 只負責讓使用者改它們
export function useAppBarSearch (query: Ref<string>, drawer?: AppBarSearch['drawer']): void {
  registerSlot(appBarSearchKey, () => ({ query, drawer }), null)
}
