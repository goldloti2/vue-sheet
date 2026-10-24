// Apps Script Web App API

import type { TableKey } from '@/schema'

export type SheetAction = 'create' | 'update' | 'delete'

// 一次推送中的一個操作。update 的 values 只含修改過的欄位（見 docs/topics/store.md）
export interface BatchOperation {
  table: TableKey
  kind: SheetAction
  id: string
  values?: Record<string, string>
}

// 讀取整張表的回應。modifiedTime 為整個試算表檔案的修改時間，不是逐列的時間
export interface TableData {
  rows: Record<string, string>[]
  modifiedTime: string
}

// 登入時送出的憑證，內容由認證模組決定（例如帳號密碼、Google 的 ID token）
export type LoginCredentials = Record<string, string>

// 後端回傳 code 'modified' 時的錯誤：Sheet 已被別處修改，整批皆未寫入
export class ConflictError extends Error {
  constructor () {
    super('Sheet 已被別處修改，這次沒有寫入任何東西')
    this.name = 'ConflictError'
  }
}

// 後端回傳 unauthorized 或 expired 時的錯誤。token 隨即被清除，router 導向登入頁
export class AuthError extends Error {
  constructor (message: string, readonly code: 'unauthorized' | 'expired') {
    super(message)
    this.name = 'AuthError'
  }
}

interface ApiSuccess<T> {
  success: true
  data: T
  // 續期：token 剩餘效期不到一半時，後端於此附上新的 token（見 docs/auth.md）
  token?: string
}

interface ApiFailure {
  success: false
  // 錯誤為一句訊息。code 只用於前端須區分的情況（見 docs/api.md）
  error: { message: string, code?: 'modified' | 'unauthorized' | 'expired' }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
