// 假後端：模擬 Apps Script 那一側的行為，好在後端還沒接上前就能測完整的增刪改流程
// 跟真的 Sheet 一樣只存原始字串，型別轉換照樣交給呼叫端的 coerceRow 做，
// 所以之後換成真後端時，appScript.ts 以上的程式碼一行都不用改
//
// 純記憶體：重整頁面就回到 CSV 的原始內容

import type { SheetAction } from '../types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
import { serializeRow } from '@/schema/types'
import { parseCsv } from './csv'
import { mockCsv } from './tables'

const tables = new Map<TableKey, Record<string, string>[]>()

// 第一次用到才把 CSV 解析進來
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

function idColumnOf (table: TableKey): string {
  return schemas[table].idColumn
}

function rowIndexOf (table: TableKey, id: string): number {
  const idColumn = idColumnOf(table)
  const index = tableRows(table).findIndex(row => row[idColumn] === id)
  if (index === -1) {
    throw new Error(`row "${id}" not found in table "${table}"`)
  }
  return index
}

// 真後端會發 UUID；這裡沿用 idColumn 的前綴讓測試資料好認（例如 TPL-ID → TPL-xxxxxxxx）
function generateId (table: TableKey): string {
  const prefix = idColumnOf(table).replace(/-?ID$/i, '') || 'ROW'
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function requireString (payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string') {
    throw new TypeError(`payload.${key} must be a string`)
  }
  return value
}

// 回傳複本，呼叫端改到的東西不會影響這裡存的狀態
export function mockList (table: TableKey): Record<string, string>[] {
  return tableRows(table).map(row => ({ ...row }))
}

// 回傳這次異動到的 row（bulkUpdate 是多筆），跟真後端一樣是還沒轉型別的原始字串
export function mockMutate (
  action: SheetAction,
  table: TableKey,
  payload: Record<string, unknown>,
): Record<string, string> | Record<string, string>[] {
  const rows = tableRows(table)
  const schema = schemas[table]

  switch (action) {
    case 'create': {
      // id 由後端產生，不看呼叫端有沒有帶
      const { id: _ignored, ...values } = payload
      const row = { [idColumnOf(table)]: generateId(table), ...serializeRow(values, schema) }
      rows.push(row)
      return { ...row }
    }

    case 'update': {
      // id 只用來定位，不寫進欄位
      const { id: _id, ...values } = payload
      const index = rowIndexOf(table, requireString(payload, 'id'))
      rows[index] = { ...rows[index], ...serializeRow(values, schema) }
      return { ...rows[index] }
    }

    case 'delete': {
      const index = rowIndexOf(table, requireString(payload, 'id'))
      const [removed] = rows.splice(index, 1)
      return { ...removed }
    }

    case 'bulkUpdate': {
      // { ids: [...], data: {...} }：對多筆套用同一組欄位更新
      const ids = payload.ids
      if (!Array.isArray(ids)) {
        throw new TypeError('payload.ids must be an array')
      }
      const data = (payload.data ?? {}) as Record<string, unknown>
      const patch = serializeRow(data, schema)

      return ids.map(id => {
        const index = rowIndexOf(table, String(id))
        rows[index] = { ...rows[index], ...patch }
        return { ...rows[index] }
      })
    }
  }
}
