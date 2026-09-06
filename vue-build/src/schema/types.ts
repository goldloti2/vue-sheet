export type SchemaColumn = {
  key: string
  label: string
  // 省略時預設跟 label 同值（見《GoogleSheet後端App-通用架構》文件 6.6 節）
  sheetHeader?: string
} & (
  | { type: 'text' }
  | { type: 'number' }
  | { type: 'date' }
  // 外鍵欄位（見文件 4.2 節一對多關聯慣例）；refTable 對應 schema/index.ts 的 schemas 裡的 key
  | { type: 'ref', refTable: string }
  // 清單類欄位：只能是 options 裡的其中一個值
  | { type: 'select', options: string[] }
)

export interface SortSpec {
  key: string
  direction: 'asc' | 'desc'
}

export interface TableSchema {
  // 對應 Google Sheet 分頁的實際名稱，也是打 API 時 table= 的值
  sheetName: string
  // 這張表的 ID 欄（sheetHeader 值）。系統欄位，不放進 columns（見文件 6.5 節）
  idColumn: string
  columns: SchemaColumn[]
  // detail 頁的顯示順序（欄位 key 陣列）。省略時沿用 columns 的順序
  detailOrder?: string[]
  // 表單頁的欄位順序（欄位 key 陣列）。省略時沿用 columns 的順序；
  formOrder?: string[]
  // 列表頁預設排序，多筆依序當 tiebreaker。省略/空陣列 = 維持原始（row number）順序
  defaultSort?: SortSpec[]
}

function columnHeader (column: SchemaColumn): string {
  return column.sheetHeader ?? column.label
}

function coerceValue (raw: string, type: SchemaColumn['type']): string | number | Date | null {
  if (raw === '') {
    return null
  }

  switch (type) {
    case 'number': {
      const parsed = Number(raw)
      return Number.isNaN(parsed) ? null : parsed
    }
    case 'date': {
      const parsed = new Date(raw)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    default: {
      return raw
    }
  }
}

// 把後端/mock 回來的原始字串 row，照 schema 轉成該有的型別
export function coerceRow<Row> (row: Record<string, string>, schema: TableSchema): Row {
  const result: Record<string, unknown> = {
    id: row[schema.idColumn] ?? '',
  }

  for (const column of schema.columns) {
    result[column.key] = coerceValue(row[columnHeader(column)] ?? '', column.type)
  }

  return result as Row
}

function formatDate (date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

export function serializeRow (values: Record<string, unknown>, schema: TableSchema): Record<string, string> {
  const result: Record<string, string> = {}

  for (const column of schema.columns) {
    if (column.key in values) {
      result[columnHeader(column)] = formatColumnValue(values, column)
    }
  }

  return result
}

export function formatColumnValue (row: object, column: SchemaColumn): string {
  const value = (row as Record<string, unknown>)[column.key]

  if (value === null || value === undefined) {
    return ''
  }

  if (column.type === 'date' && value instanceof Date) {
    return formatDate(value)
  }

  return String(value)
}

// 只知道欄位 key、還沒有 column 物件時用這個（例如列表頁只想挑幾個欄位顯示）
export function formatField (row: object, schema: TableSchema, key: string): string {
  const column = schema.columns.find(candidate => candidate.key === key)
  return column ? formatColumnValue(row, column) : ''
}

// 依 schema 產生一筆空白 row，給新增表單當初始值；id 留空，由後端產生
export function emptyRow<Row> (schema: TableSchema): Row {
  const result: Record<string, unknown> = { id: '' }

  for (const column of schema.columns) {
    result[column.key] = null
  }

  return result as Row
}

// 把 row 攤成 { columnKey: 值 } 的物件，只帶 schema.columns 裡的真實欄位（不含 id）；
// 送 create/update 給後端的 payload 用這個組
export function columnValues (row: object, schema: TableSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const column of schema.columns) {
    result[column.key] = (row as Record<string, unknown>)[column.key]
  }
  return result
}

// null/undefined 一律排最後（不管 asc/desc），其餘依實際型別比較（Date 比時間、number 比大小、其餘當字串比較）
function compareValues (a: unknown, b: unknown): number {
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1
  }
  if (b === null || b === undefined) {
    return -1
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return String(a).localeCompare(String(b))
}

// 列表頁排序：照 schema.defaultSort 依序當 tiebreaker；沒設定就回傳原始順序（row number）
export function sortRows<Row> (rows: readonly Row[], schema: TableSchema): Row[] {
  const sortSpecs = schema.defaultSort ?? []
  if (sortSpecs.length === 0) {
    return [...rows]
  }

  // eslint-disable-next-line unicorn/no-array-sort
  return [...rows].sort((rowA, rowB) => {
    for (const spec of sortSpecs) {
      const result = compareValues(
        (rowA as Record<string, unknown>)[spec.key],
        (rowB as Record<string, unknown>)[spec.key],
      )
      if (result !== 0) {
        return spec.direction === 'desc' ? -result : result
      }
    }
    return 0
  })
}

// 依單一鍵值排序，鍵值是 number 就數字比較，否則當字串比較（用於分組鍵，不吃 schema）
export function sortByKey<Row> (rows: readonly Row[], key: (row: Row) => string | number): Row[] {
  // eslint-disable-next-line unicorn/no-array-sort
  return [...rows].sort((rowA, rowB) => {
    const keyA = key(rowA)
    const keyB = key(rowB)
    if (typeof keyA === 'number' && typeof keyB === 'number') {
      return keyA - keyB
    }
    return String(keyA).localeCompare(String(keyB))
  })
}

export interface GroupLevel<Row> {
  // 排序用；分開於 label 是為了避免依顯示字串排序出錯（例如「10月」< 「2月」）
  sortKey: (row: Row) => string | number
  label: (row: Row) => string
}

export type RowGroup<Row>
  = | { label: string, rows: Row[] }
    | { label: string, subgroups: RowGroup<Row>[] }

function buildGroups<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  const [level, ...restLevels] = levels
  if (!level) {
    return []
  }

  const groups: { label: string, rows: Row[] }[] = []
  for (const row of rows) {
    const label = level.label(row)
    const lastGroup = groups.at(-1)
    if (lastGroup?.label === label) {
      lastGroup.rows.push(row)
    } else {
      groups.push({ label, rows: [row] })
    }
  }

  if (restLevels.length === 0) {
    return groups
  }

  return groups.map(group => ({
    label: group.label,
    subgroups: buildGroups(group.rows, restLevels),
  }))
}

// 依多層分組鍵把 rows 分成巢狀分組（由外到內）。levels 依序疊加穩定排序，
// 原本的排序（例如 sortRows 排好的 defaultSort）會保留成最內層的 tiebreaker
export function groupRows<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  let sorted = [...rows]
  for (let i = levels.length - 1; i >= 0; i--) {
    sorted = sortByKey(sorted, levels[i].sortKey)
  }
  return buildGroups(sorted, levels)
}

// 把巢狀分組攤回一維，順序就是畫面上由上往下的順序（給 useListOrder 用）
export function flattenGroups<Row> (groups: readonly RowGroup<Row>[]): Row[] {
  return groups.flatMap(group => 'rows' in group ? group.rows : flattenGroups(group.subgroups))
}
