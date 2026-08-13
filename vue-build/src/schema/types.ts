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
)

export interface TableSchema {
  // 對應 Google Sheet 分頁的實際名稱，也是打 API 時 table= 的值
  sheetName: string
  // 這張表的 ID 欄（sheetHeader 值）。系統欄位，不放進 columns（見文件 6.5 節）
  idColumn: string
  columns: SchemaColumn[]
  // detail 頁的顯示順序（欄位 key 陣列）。省略時沿用 columns 的順序；
  // 跟 columns 定義順序分開，是因為之後表單（FormPageTemplate）可能需要不同順序
  detailOrder?: string[]
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

// coerceRow 的反向操作：把已轉型別的欄位值照 type 格式化成畫面顯示用的字串
export function formatColumnValue (row: object, column: SchemaColumn): string {
  const value = (row as Record<string, unknown>)[column.key]

  if (value === null || value === undefined) {
    return ''
  }

  if (column.type === 'date' && value instanceof Date) {
    return value.toLocaleDateString()
  }

  return String(value)
}

// 只知道欄位 key、還沒有 column 物件時用這個（例如列表頁只想挑幾個欄位顯示）
export function formatField (row: object, schema: TableSchema, key: string): string {
  const column = schema.columns.find(candidate => candidate.key === key)
  return column ? formatColumnValue(row, column) : ''
}

// detail 頁該用的欄位順序：有設 detailOrder 就照它排，沒設就沿用 columns 順序
export function detailColumns (schema: TableSchema): SchemaColumn[] {
  if (!schema.detailOrder) {
    return schema.columns
  }

  return schema.detailOrder
    .map(key => schema.columns.find(column => column.key === key))
    .filter((column): column is SchemaColumn => column !== undefined)
}
