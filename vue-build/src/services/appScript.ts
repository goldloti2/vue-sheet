// 前端與 Apps Script Web App 的對接層。其他程式一律經由此處呼叫 API，不自行 fetch

// 未設定 VITE_APPS_SCRIPT_URL 時使用 mock/ 中的假後端，兩者回傳的形狀相同

import type { ApiResponse, BatchOperation, LoginCredentials, TableData } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { clearToken, setToken, token } from './auth/token'
import { createLimiter } from './limiter'
import { mockAuthorize, mockBatch, mockList, mockLogin } from './mock/backend'
import { AuthError, ConflictError } from './types'

export { AuthError, ConflictError } from './types'
export type { ApiResponse, BatchOperation, LoginCredentials, SheetAction, TableData } from './types'

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL

// 同時送出的請求數上限（見 docs/api.md）
const MAX_CONCURRENT_REQUESTS = 6
const limit = createLimiter(MAX_CONCURRENT_REQUESTS)

// 成敗一律依 body 的 success 判斷（見 docs/api.md）。只區分衝突與認證失敗，其他錯誤為一句訊息
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

  renewToken(payload.token)
  return payload.data
}

// 後端續期時於回應中附上新的 token，前端直接替換（見 docs/auth.md）
function renewToken (newToken: string | undefined): void {
  if (newToken) {
    setToken(newToken)
  }
}

// token 一律置於網址，GET 與 POST 相同（見 docs/auth.md）
function endpoint (url: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params)
  if (token.value) {
    query.set('token', token.value)
  }
  return query.size > 0 ? `${url}?${query}` : url
}

// Content-Type 刻意為 text/plain：application/json 會觸發 Apps Script 無法回應的 CORS 預檢
async function post<T> (url: string, body: unknown): Promise<T> {
  return unwrap<T>(await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  }))
}

// 開發時將 payload 印至 console，production build 移除此段。shown 為遮蔽密碼與 token 後的內容
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

// 呼叫 API 的共同外殼：同時送出的請求數有上限。認證失敗時清除 token，router 隨即導向登入頁
async function request<T> (label: string, shown: unknown, run: () => Promise<T>, shownResult?: (data: T) => unknown): Promise<T> {
  try {
    return await limit(() => trace(label, shown, run, shownResult))
  } catch (error) {
    if (error instanceof AuthError) {
      clearToken()
    }
    throw error
  }
}

// GET：回傳整張表與檔案的 modifiedTime（推送時作為 since）。後端的字串於回傳前依 schema 轉型
export async function fetchTable<Row> (table: TableKey): Promise<{ rows: Row[], modifiedTime: string }> {
  // trace 記錄的是轉型前的字串，即後端實際的回應
  const { rows, modifiedTime } = await request<TableData>(`GET ${table}`, { table }, async () => {
    if (API_URL) {
      return unwrap<TableData>(await fetch(endpoint(API_URL, { table })))
    }
    renewToken(mockAuthorize(token.value))
    return mockList(table)
  })

  return { rows: rows.map(row => coerceRow<Row>(row, schemas[table])), modifiedTime }
}

// POST：一次送出整批操作，回傳寫入後的 modifiedTime。全有全無，省略 since 時強制推送（見 docs/api.md）
export async function mutateBatch (operations: readonly BatchOperation[], since?: string): Promise<string> {
  const { modifiedTime } = await request('POST', { operations, since }, async () => {
    if (API_URL) {
      return post<{ modifiedTime: string }>(endpoint(API_URL), { operations, since })
    }
    renewToken(mockAuthorize(token.value))
    return { modifiedTime: mockBatch(operations, since) }
  })

  return modifiedTime
}

// POST：登入，以憑證換取 token（見 docs/auth.md）。console 上遮蔽密碼與 token
export async function fetchToken (credentials: LoginCredentials): Promise<string> {
  const shown = { action: 'login', credentials: { ...credentials, password: '***' } }
  const result = await request('POST login', shown, async () => API_URL
    ? post<{ token: string }>(API_URL, { action: 'login', credentials })
    : mockLogin(credentials), () => ({ token: '***' }))

  return result.token
}
