import type { TableKey } from '@/schema'
import type { InjectionKey, Ref } from 'vue'
import { inject, provide } from 'vue'

// 子表區塊的設定，即 ChildList 的 props
export interface ChildBlockOptions {
  title: string
  // 最多先顯示幾列，0 為全部列出
  limit?: number
  // 「展開」前往的頁面，省略時沒有「展開」
  to?: string
  emptyText?: string
  // 沒有子列時整塊不顯示，包括標題與按鈕
  hideEmpty?: boolean
}

// 補上預設值後的設定
export type ChildBlock = Readonly<ChildBlockOptions & Required<Pick<ChildBlockOptions, 'limit' | 'emptyText'>>>

const childBlockKey: InjectionKey<ChildBlock> = Symbol('childBlock')

// 由 ChildList 呼叫，其中的展開頁以區塊呈現
export function provideChildBlock (block: ChildBlock): void {
  provide(childBlockKey, block)
}

// 不在子表區塊中時為 null，例如展開頁本身
export function useChildBlock (): ChildBlock | null {
  return inject(childBlockKey, null)
}

type RecordId = Readonly<Ref<string>>

// 依表區分，子表區塊中的展開頁只取用父表的 id
const recordIdKey = (table: TableKey) => `recordId:${table}`

export function provideRecordId (table: TableKey, id: RecordId): void {
  provide(recordIdKey(table), id)
}

// 外層的詳細頁顯示的列的 id。不在子表區塊中，或外層的詳細頁為其他表時為 null
export function useBlockRecordId (table: TableKey): RecordId | null {
  const id = inject<RecordId | null>(recordIdKey(table), null)
  return useChildBlock() ? id : null
}
