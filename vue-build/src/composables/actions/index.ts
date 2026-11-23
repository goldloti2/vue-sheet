import type { TableKey } from '@/schema'

// 各表的 use表名Actions，key 為表的 key。頁面一律以 useActions 取得
export const tableActions = {} satisfies { [K in TableKey]?: (...args: never[]) => object }

export type ActionTableKey = keyof typeof tableActions

type TableActions = typeof tableActions

// 一張表的動作。其餘的參數即該表的 use表名Actions 的參數，回傳值保留該表專有的動作
export function useActions<K extends ActionTableKey> (table: K, ...args: Parameters<TableActions[K]>): ReturnType<TableActions[K]> {
  const use = tableActions[table] as unknown as (...input: Parameters<TableActions[K]>) => ReturnType<TableActions[K]>
  return use(...args)
}
