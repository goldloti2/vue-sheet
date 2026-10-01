// 假後端：模擬 Apps Script 那一側的行為，好在後端還沒接上前就能測完整的增刪改流程
// 跟真的 Sheet 一樣只存原始字串，型別轉換照樣交給呼叫端的 coerceRow 做，
// 所以之後換成真後端時，appScript.ts 以上的程式碼一行都不用改
//
// 純記憶體：重整頁面就回到 CSV 的原始內容

import type { BatchOperation } from '../types'
import type { TableKey } from '@/schema'
import { schemas } from '@/schema'
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

function asStrings (values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value ?? '')]),
  )
}

// 回傳複本，呼叫端改到的東西不會影響這裡存的狀態
export function mockList (table: TableKey): Record<string, string>[] {
  return tableRows(table).map(row => ({ ...row }))
}

function applyOperation (operation: BatchOperation): void {
  const { table, id } = operation
  const rows = tableRows(table)
  const values = asStrings(operation.values ?? {})

  switch (operation.kind) {
    case 'create': {
      // id 由呼叫端帶進來。已經存在就當作這次是重送、不重複建立
      if (rows.some(row => row[idColumnOf(table)] === id)) {
        return
      }
      rows.push({ [idColumnOf(table)]: id, ...values })
      return
    }

    case 'update': {
      // 只有改過的欄位會進來，其餘保持原狀（真後端是在鎖裡讀現值再合併，見 docs/store.md）
      const index = rowIndexOf(table, id)
      rows[index] = { ...rows[index], ...values }
      return
    }

    case 'delete': {
      rows.splice(rowIndexOf(table, id), 1)
    }
  }
}

// 一次推送的整批操作，全有全無：中途失敗就把動到的表還原，跟真後端在 LockService 裡的行為一致。
// 不回傳資料列——前端快取在寫入當下就改好了，推送成功後本來就會重抓
export function mockBatch (operations: readonly BatchOperation[]): void {
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
}
