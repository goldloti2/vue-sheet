// 前端 ↔ Apps Script Web App 的對接層
// 目前為空殼，等 Apps Script 後端（Code.gs）部署出網址後再實作

import type { SheetAction } from './types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { coerceRow } from '@/schema/types'
import { parseCsv } from './mock/csv'
import { mockCsv } from './mock/tables'

export type { ApiResponse, SheetAction } from './types'

// GET：list/get，回傳整張表
// 回傳前先照 schema 把 raw 字串轉成該有的型別（見《GoogleSheet後端App-通用架構》文件 6.1 節）
export async function fetchTable<Row> (table: TableKey): Promise<Row[]> {
  const csv = mockCsv[table]
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
