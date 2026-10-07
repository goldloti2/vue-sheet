// Apps Script Web App API

import type { TableKey } from '@/schema'

export type SheetAction = 'create' | 'update' | 'delete'

// 一次推送裡的一個操作。update 的 values 只有改過的那幾欄（見 docs/store.md）
export interface BatchOperation {
  table: TableKey
  kind: SheetAction
  id: string
  values?: Record<string, string>
}

// 讀整張表的回應。modifiedTime 是整個試算表檔案的修改時間（後端用
// DriveApp.getFileById(id).getLastUpdated()），不是逐列的——Sheets 沒有逐列的修改時間
export interface TableData {
  rows: Record<string, string>[]
  modifiedTime: string
}

// 登入時送出的憑證，內容由認證模組決定（帳號密碼、Google 的 ID token…）
export type LoginCredentials = Record<string, string>

// 後端回 error: 'modified' 時前端拿到的錯誤：Sheet 在這段時間被別處改過，這一批完全沒有寫入
export class ConflictError extends Error {
  constructor () {
    super('Sheet 已被別處修改，這次沒有寫入任何東西')
    this.name = 'ConflictError'
  }
}

// 後端回 unauthorized／expired：token 已經被清掉，router 會把畫面帶到登入頁
export class AuthError extends Error {
  constructor (message: string, readonly code: 'unauthorized' | 'expired') {
    super(message)
    this.name = 'AuthError'
  }
}

interface ApiSuccess<T> {
  success: true
  data: T
  // 續期：token 剩不到一半效期時後端換一張新的放這裡（見 docs/auth.md）
  token?: string
}

interface ApiFailure {
  success: false
  // 錯誤只有一句訊息；code 只用在前端要分辨的情況：
  // 'modified'（衝突）、'unauthorized'（登入失敗或 token 無效）、'expired'（token 過期）
  error: { message: string, code?: 'modified' | 'unauthorized' | 'expired' }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
