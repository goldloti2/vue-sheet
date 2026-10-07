// 前端 ↔ Apps Script Web App 的對接層：其他程式碼一律透過這裡打 API，不自己 fetch
//
// VITE_APPS_SCRIPT_URL 沒設就走 mock/ 底下的假後端（開發預設）。兩邊回傳的形狀一樣，
// 所以上線只是在 .env 填一個網址，這個檔案以外的程式碼都不用動；真後端穩定後整個 mock/ 可以刪掉

import type { ApiResponse, BatchOperation, LoginCredentials, TableData } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { clearToken, token } from './auth/token'
import { mockAuthorize, mockBatch, mockList, mockLogin } from './mock/backend'
import { AuthError, ConflictError } from './types'

export { AuthError, ConflictError } from './types'
export type { ApiResponse, BatchOperation, LoginCredentials, SheetAction, TableData } from './types'

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL

// Apps Script 幾乎都回 200，所以成敗一律看 body 的 success（見 docs/api.md）。
// 要分辨的只有衝突與認證失敗，其他錯誤就是一句訊息
async function unwrap<T> (response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`後端回應 ${response.status}`)
  }

  const payload = await response.json() as ApiResponse<T>
  if (!payload.success) {
    const { message, code } = payload.error
    if (code === 'modified') {
      throw new ConflictError()
    }
    throw code === 'unauthorized' || code === 'expired' ? new AuthError(message, code) : new Error(message)
  }

  return payload.data
}

// GET 沒有 body，所以 token 一律放網址，POST 也一樣（見 docs/auth.md）
function endpoint (url: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params)
  if (token.value) {
    query.set('token', token.value)
  }
  return query.size > 0 ? `${url}?${query}` : url
}

// Content-Type 刻意留成 text/plain：帶 application/json 會觸發 CORS 預檢，
// 而 Apps Script 的 Web App 回不了預檢。後端用 JSON.parse(e.postData.contents) 讀
async function post<T> (url: string, body: unknown): Promise<T> {
  return unwrap<T>(await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  }))
}

// 開發時把進出的 payload 印到 console；production build 會把整段當死碼拿掉。
// shown 是要印的那份（密碼、token 遮掉），不是真正送出去的
async function trace<T> (label: string, shown: unknown, run: () => Promise<T>, shownResult = (data: T): unknown => data): Promise<T> {
  if (!import.meta.env.DEV) {
    return run()
  }

  console.debug(`[api] → ${label}`, shown)
  try {
    const data = await run()
    console.debug(`[api] ← ${label}`, shownResult(data))
    return data
  } catch (error) {
    console.debug(`[api] ✗ ${label}`, error)
    throw error
  }
}

// 打 API 的共同外殼：認證失敗就清掉 token，router 看到 token 沒了會把畫面帶到登入頁
async function request<T> (label: string, shown: unknown, run: () => Promise<T>, shownResult?: (data: T) => unknown): Promise<T> {
  try {
    return await trace(label, shown, run, shownResult)
  } catch (error) {
    if (error instanceof AuthError) {
      clearToken()
    }
    throw error
  }
}

// GET：list/get，回傳整張表 + 整個檔案的 modifiedTime（推送時當 since 用）
// 後端給的是原始字串，回傳前照 schema 轉成該有的型別（見文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<{ rows: Row[], modifiedTime: string }> {
  // trace 包的是轉型別之前的原始字串，也就是後端真正回了什麼
  const { rows, modifiedTime } = await request<TableData>(`GET ${table}`, { table }, async () => {
    if (API_URL) {
      return unwrap<TableData>(await fetch(endpoint(API_URL, { table })))
    }
    mockAuthorize(token.value)
    return mockList(table)
  })

  return { rows: rows.map(row => coerceRow<Row>(row, schemas[table])), modifiedTime }
}

// POST：一次送出整批操作，回傳寫入後的新 modifiedTime。
// 全有全無：後端在鎖裡跑完整批，中途失敗就拋錯讓前端保留佇列重送。
// since 是前端上次看到的 modifiedTime，後端在同一把鎖裡比對；對不上就拋 ConflictError，什麼都不寫。
// 不給 since 就是強制推送（不比對）。不回傳資料列——寫入當下前端快取就改好了，推送成功後本來就會重抓
export async function mutateBatch (operations: readonly BatchOperation[], since?: string): Promise<string> {
  const { modifiedTime } = await request('POST', { operations, since }, async () => {
    if (API_URL) {
      return post<{ modifiedTime: string }>(endpoint(API_URL), { operations, since })
    }
    mockAuthorize(token.value)
    return { modifiedTime: mockBatch(operations, since) }
  })

  return modifiedTime
}

// POST：登入，用憑證換 token（約定見 docs/auth.md）。console 上的密碼與 token 會遮掉
export async function fetchToken (credentials: LoginCredentials): Promise<string> {
  const shown = { action: 'login', credentials: { ...credentials, password: '***' } }
  const result = await request('POST login', shown, async () => API_URL
    ? post<{ token: string }>(API_URL, { action: 'login', credentials })
    : mockLogin(credentials), () => ({ token: '***' }))

  return result.token
}
