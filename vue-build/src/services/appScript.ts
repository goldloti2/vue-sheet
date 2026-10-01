// 前端 ↔ Apps Script Web App 的對接層：其他程式碼一律透過這裡打 API，不自己 fetch
//
// 目前兩個函式都轉呼叫 mock/ 底下的假後端。等 Apps Script 部署出網址後，
// 只要把這兩個函式的主體換成真的 fetch（讀 import.meta.env.VITE_APPS_SCRIPT_URL、
// 依 types.ts 的 ApiResponse 拆信封），然後刪掉整個 mock/ 資料夾就完成上線，
// 這個檔案以外的程式碼都不用動。

import type { BatchOperation } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { mockBatch, mockList } from './mock/backend'

export { ConflictError } from './types'
export type { ApiResponse, BatchOperation, SheetAction, TableData } from './types'

// GET：list/get，回傳整張表 + 整個檔案的 modifiedTime（推送時當 since 用）
// 後端給的是原始字串，回傳前照 schema 轉成該有的型別（見文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<{ rows: Row[], modifiedTime: string }> {
  const { rows, modifiedTime } = mockList(table)
  return { rows: rows.map(row => coerceRow<Row>(row, schemas[table])), modifiedTime }
}

// POST：一次送出整批操作，回傳寫入後的新 modifiedTime。
// 全有全無：後端在鎖裡跑完整批，中途失敗就拋錯讓前端保留佇列重送。
// since 是前端上次看到的 modifiedTime，後端在同一把鎖裡比對；對不上就拋 ConflictError，什麼都不寫。
// 不給 since 就是強制推送（不比對）。不回傳資料列——寫入當下前端快取就改好了，推送成功後本來就會重抓
export async function mutateBatch (operations: readonly BatchOperation[], since?: string): Promise<string> {
  return mockBatch(operations, since)
}
