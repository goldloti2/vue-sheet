// 前端 ↔ Apps Script Web App 的對接層：其他程式碼一律透過這裡打 API，不自己 fetch
//
// VITE_APPS_SCRIPT_URL 沒設就走 mock/ 底下的假後端（開發預設）。兩邊回傳的形狀一樣，
// 所以上線只是在 .env 填一個網址，這個檔案以外的程式碼都不用動；真後端穩定後整個 mock/ 可以刪掉

import type { ApiResponse, BatchOperation, TableData } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { mockBatch, mockList } from './mock/backend'
import { ConflictError } from './types'

export { ConflictError } from './types'
export type { ApiResponse, BatchOperation, SheetAction, TableData } from './types'

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL

// Apps Script 幾乎都回 200，所以成敗一律看 body 的 success（見 docs/api.md）。
// 衝突是唯一要分辨的錯誤，認 code: 'modified'
async function unwrap<T> (response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`後端回應 ${response.status}`)
  }

  const payload = await response.json() as ApiResponse<T>
  if (!payload.success) {
    throw payload.error.code === 'modified' ? new ConflictError() : new Error(payload.error.message)
  }

  return payload.data
}

// GET：list/get，回傳整張表 + 整個檔案的 modifiedTime（推送時當 since 用）
// 後端給的是原始字串，回傳前照 schema 轉成該有的型別（見文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<{ rows: Row[], modifiedTime: string }> {
  const { rows, modifiedTime } = API_URL
    ? await unwrap<TableData>(await fetch(`${API_URL}?table=${encodeURIComponent(table)}`))
    : mockList(table)

  return { rows: rows.map(row => coerceRow<Row>(row, schemas[table])), modifiedTime }
}

// POST：一次送出整批操作，回傳寫入後的新 modifiedTime。
// 全有全無：後端在鎖裡跑完整批，中途失敗就拋錯讓前端保留佇列重送。
// since 是前端上次看到的 modifiedTime，後端在同一把鎖裡比對；對不上就拋 ConflictError，什麼都不寫。
// 不給 since 就是強制推送（不比對）。不回傳資料列——寫入當下前端快取就改好了，推送成功後本來就會重抓
export async function mutateBatch (operations: readonly BatchOperation[], since?: string): Promise<string> {
  if (!API_URL) {
    return mockBatch(operations, since)
  }

  // Content-Type 刻意留成 text/plain：帶 application/json 會觸發 CORS 預檢，
  // 而 Apps Script 的 Web App 回不了預檢。後端用 JSON.parse(e.postData.contents) 讀
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ operations, since }),
  })

  const { modifiedTime } = await unwrap<{ modifiedTime: string }>(response)
  return modifiedTime
}
