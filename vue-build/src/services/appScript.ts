// 前端 ↔ Apps Script Web App 的對接層
// 目前為空殼，等 Apps Script 後端（Code.gs）部署出網址後再實作

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

function splitCsvLine(line: string): string[] {
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

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']))
  })
}

// GET：list/get，query string 帶 table + 篩選欄位
export async function fetchTable<T>(
  table: string,
  filters?: Record<string, string>,
): Promise<T> {
  const csv = mockTables[table]
  if (!csv) throw new Error(`no mock data for table "${table}"`)

  const rows = parseCsv(csv)
  const filtered = filters
    ? rows.filter(row => Object.entries(filters).every(([key, value]) => row[key] === value))
    : rows

  return filtered as T
}

// POST：create/update/delete/bulkUpdate，body 帶 action 欄位
export async function mutateTable<T>(
  action: SheetAction,
  table: string,
  payload: Record<string, unknown>,
): Promise<T> {
  throw new Error(`mutateTable not implemented yet (action=${action}, table=${table}, payload=${JSON.stringify(payload)})`)
}
