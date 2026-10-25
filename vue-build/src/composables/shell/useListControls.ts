import type { SlotSetter } from '@/composables/shell/useActionSlot'
import type { Filters } from '@/schema/filter'
import type { SortSpec, TableSchema } from '@/schema/types'
import type { InjectionKey, Ref } from 'vue'
import { registerSlot } from '@/composables/shell/useActionSlot'

// 抽屜中的一張表。rows 為未過濾的整表，select 只列出其中出現過的值
export interface ListTable {
  schema: TableSchema
  filters: Ref<Filters>
  rows: Ref<readonly object[]>
  // 使用者選擇的排序，null 表示 schema.defaultSort。有提供時才顯示排序按鈕
  sort?: Ref<SortSpec | null>
  // 條件往下影響此表的上層表（tableLabel），只用於互動 dashboard
  inheritedFrom?: () => string[]
}

export interface ListControls {
  query: Ref<string>
  // 有提供時顯示篩選按鈕（搜尋欄內）與排序按鈕（App Bar 上），兩者開啟同一個右側抽屜
  drawer?: {
    // 每張表各有一份條件與排序，同時生效。單表的頁面只須一個元素
    tables: ListTable[]
    // 頁面的頁籤，值為某張表的 tableLabel。抽屜開啟時先顯示該表
    current?: Readonly<Ref<string>>
  }
}

export const listControlsKey: InjectionKey<SlotSetter<ListControls | null>> = Symbol('listControls')

// 頁面登記後 App Bar 才顯示搜尋與排序按鈕。query、filters、sort 屬於頁面，AppShell 只提供修改的介面
export function useListControls (query: Ref<string>, drawer?: ListControls['drawer']): void {
  registerSlot(listControlsKey, () => ({ query, drawer }), null)
}
