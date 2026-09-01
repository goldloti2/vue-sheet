// 前端 ↔ Apps Script Web App 的對接層
// 目前為空殼，等 Apps Script 後端（Code.gs）部署出網址後再實作

import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'

export type SheetAction = 'create' | 'update' | 'delete' | 'bulkUpdate'

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  error: { message: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

// 假資料：各表自己的 mock CSV，由使用這套框架的專案自行提供並在這裡註冊
const mockTables: Record<string, string> = {}

function splitCsvLine (line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

function parseCsv (text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']))
  })
}

// GET：list/get，回傳整張表
// 回傳前先照 schema 把 raw 字串轉成該有的型別（見《GoogleSheet後端App-通用架構》文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<Row[]> {
  const csv = mockTables[table]
  if (!csv) {
    throw new Error(`no mock data for table "${table}"`)
  }

  const schema = schemas[table]
  const rows = parseCsv(csv)

  return rows.map(row => coerceRow<Row>(row, schema))
}

// POST：create/update/delete/bulkUpdate，body 帶 action 欄位
export async function mutateTable<T> (
  action: SheetAction,
  table: TableKey,
  payload: Record<string, unknown>,
): Promise<T> {
  throw new Error(`mutateTable not implemented yet (action=${action}, table=${table}, payload=${JSON.stringify(payload)})`)
}
