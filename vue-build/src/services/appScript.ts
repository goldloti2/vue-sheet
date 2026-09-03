// 前端 ↔ Apps Script Web App 的對接層：其他程式碼一律透過這裡打 API，不自己 fetch
//
// 目前兩個函式都轉呼叫 mock/ 底下的假後端。等 Apps Script 部署出網址後，
// 只要把這兩個函式的主體換成真的 fetch（讀 import.meta.env.VITE_APPS_SCRIPT_URL、
// 依 types.ts 的 ApiResponse 拆信封），然後刪掉整個 mock/ 資料夾就完成上線，
// 這個檔案以外的程式碼都不用動。

import type { SheetAction } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { mockList, mockMutate } from './mock/backend'

export type { ApiResponse, SheetAction } from './types'

// GET：list/get，回傳整張表
// 後端給的是原始字串，回傳前照 schema 轉成該有的型別（見文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<Row[]> {
  const rows = mockList(table)
  return rows.map(row => coerceRow<Row>(row, schemas[table]))
}

// POST：create/update/delete/bulkUpdate，body 帶 action 欄位
export async function mutateTable<T> (
  action: SheetAction,
  table: TableKey,
  payload: Record<string, unknown>,
): Promise<T> {
  const result = mockMutate(action, table, payload)
  const schema = schemas[table]

  return (Array.isArray(result)
    ? result.map(row => coerceRow(row, schema))
    : coerceRow(result, schema)) as T
}
