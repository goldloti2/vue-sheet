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

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  // 錯誤只有一句訊息、不分類；唯一的例外是 code: 'modified'，因為前端要認出衝突才能問使用者
  error: { message: string, code?: 'modified' }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
