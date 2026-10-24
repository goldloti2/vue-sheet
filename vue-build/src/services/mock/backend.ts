// 假後端：模擬 Apps Script 的行為，只存原始字串，型別由呼叫端的 coerceRow 轉換

// 只存於記憶體，重新整理頁面即回到 CSV 的原始內容

import type { BatchOperation, LoginCredentials, TableData } from '../types'
import type { TableKey } from '@/schema'
import { authMethod } from '@/config/app'
import { schemas } from '@/schema'
import { idHeader } from '@/schema/types'
import { decodeMessage, encodeMessage } from '../auth/tokenMessage'
import { AuthError, ConflictError } from '../types'
import { parseCsv } from './csv'
import { mockCsv } from './tables'

const tables = new Map<TableKey, Record<string, string>[]>()

// 首次使用時才解析 CSV
function tableRows (table: TableKey): Record<string, string>[] {
  const loaded = tables.get(table)
  if (loaded) {
    return loaded
  }

  const csv = mockCsv[table]
  if (!csv) {
    throw new Error(`no mock data for table "${table}"`)
  }

  const rows = parseCsv(csv)
  tables.set(table, rows)
  return rows
}

function idHeaderOf (table: TableKey): string {
  return idHeader(schemas[table])
}

function rowIndexOf (table: TableKey, id: string): number {
  const header = idHeaderOf(table)
  const index = tableRows(table).findIndex(row => row[header] === id)
  if (index === -1) {
    throw new Error(`row "${id}" not found in table "${table}"`)
  }
  return index
}

function asStrings (values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value ?? '')]),
  )
}

// 整個檔案的修改時間，對應真後端的 DriveApp.getFileById(id).getLastUpdated()
let modifiedTime = new Date().toISOString()

// 與 Sheet 相同，開頭的單引號為純文字前綴，不屬於內容
function readValues (row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([header, value]) => [header, value.replace(/^'/, '')]),
  )
}

// 回傳複本，呼叫端的修改不影響此處的狀態
export function mockList (table: TableKey): TableData {
  return { rows: tableRows(table).map(row => readValues(row)), modifiedTime }
}

// 開發用：於 console 呼叫 mockTouch()，模擬 Sheet 被別處修改，以測試衝突的處理
if (import.meta.env.DEV) {
  Object.assign(globalThis, {
    mockTouch: () => {
      modifiedTime = new Date().toISOString()
      return modifiedTime
    },
  })
}

function applyOperation (operation: BatchOperation): void {
  const { table, id } = operation
  const rows = tableRows(table)
  const values = asStrings(operation.values ?? {})

  switch (operation.kind) {
    case 'create': {
      // id 由呼叫端提供。id 已存在時視為重送，不重複建立
      if (rows.some(row => row[idHeaderOf(table)] === id)) {
        return
      }
      rows.push({ [idHeaderOf(table)]: id, ...values })
      return
    }

    case 'update': {
      // 只傳入修改過的欄位，其餘保持原狀（見 docs/topics/store.md）
      const index = rowIndexOf(table, id)
      rows[index] = { ...rows[index], ...values }
      return
    }

    case 'delete': {
      rows.splice(rowIndexOf(table, id), 1)
    }
  }
}

// 一次推送的整批操作，行為與真後端相同（見 docs/api.md）。回傳寫入後的 modifiedTime
export function mockBatch (operations: readonly BatchOperation[], since?: string): string {
  if (since !== undefined && since !== modifiedTime) {
    throw new ConflictError()
  }

  const backup = new Map<TableKey, Record<string, string>[]>()
  for (const operation of operations) {
    if (!backup.has(operation.table)) {
      backup.set(operation.table, tableRows(operation.table).map(row => ({ ...row })))
    }
  }

  try {
    for (const operation of operations) {
      applyOperation(operation)
    }
  } catch (error) {
    for (const [table, rows] of backup) {
      tables.set(table, rows)
    }
    throw error
  }

  modifiedTime = new Date().toISOString()
  return modifiedTime
}

const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60

// 登入：假後端沒有帳號表，任何憑證皆成功。token 的格式與真後端相同
export function mockLogin (credentials: LoginCredentials): { token: string } {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS
  return { token: encodeMessage({ user: credentials.username ?? '', exp }) }
}

// 與真後端的 verify 相同，檢查格式與過期，並於效期剩不到一半時回傳新的 token。不檢查帳號
export function mockAuthorize (token: string | null): string | undefined {
  if (authMethod === 'none') {
    return undefined
  }
  const message = token ? decodeMessage(token) : null
  if (!message || typeof message.user !== 'string' || typeof message.exp !== 'number') {
    throw new AuthError('登入資訊無效，請重新登入', 'unauthorized')
  }
  const now = Date.now() / 1000
  if (message.exp < now) {
    throw new AuthError('登入已過期，請重新登入', 'expired')
  }
  return message.exp - now < TOKEN_LIFETIME_SECONDS / 2
    ? encodeMessage({ user: message.user, exp: Math.floor(now) + TOKEN_LIFETIME_SECONDS })
    : undefined
}
