// 新增表單的初始值。函式於開啟表單時求值
export type ColumnDefault<T> = T | (() => T)

// 每張表的 Row 介面皆 extends 此介面。id 等於主鍵的值，$label 為 store 掛上的 getter（見 labelColumn）
export interface RowBase {
  id: string
  readonly $label: string
}

// 每種欄位型別只於此處定義一次：值的型別與型別專屬的設定。真實與虛擬欄位皆由此推導
interface ColumnTypes {
  /** 一般文字。multiline 為長文：表單以多行輸入框輸入，詳細頁保留換行 */
  text: { value: string | null, extra: { multiline?: boolean } }
  /** 數字。min、max 為輸入範圍與驗證的上下限，step 為 ＋／− 每次的增減（預設 1） */
  number: { value: number | null, extra: { min?: number, max?: number, step?: number } }
  /** 日期，不含時間。讀取時歸零至當天午夜 */
  date: { value: Date | null }
  /** 是／否。Sheet 上為 TRUE、FALSE，空的儲存格為 null，不視為否 */
  boolean: { value: boolean | null }
  /** 時間長度，值為 "時:分:秒" 字串（例如 "30:15:00"），時數不設上限 */
  duration: { value: string | null }
  /** 圖片，一格一張。值為行內 SVG、圖片網址或 Google Drive 的檔案（見 schema/image.ts） */
  image: { value: string | null }
  /** 外鍵，值為父列的 id。refTable、onDelete、onEmpty、refSort、allowCreate 見 docs/topics/schema.md 的「跨表關聯」 */
  ref: { value: string | null, extra: { refTable: string, onDelete?: 'cascade', onEmpty?: 'delete', refSort?: SortSpec[], allowCreate?: boolean } }
  /** 清單，預設只能選 options 中的值。開啟 allowCustom 時，options 只是建議 */
  select: { value: string | null, extra: { options: string[], allowCustom?: boolean } }
}

type ColumnType = keyof ColumnTypes
type ColumnValue<T extends ColumnType> = ColumnTypes[T]['value']
type ColumnExtra<T extends ColumnType> = ColumnTypes[T] extends { extra: infer Extra } ? Extra : object

// 框架端不區分各表的 Row，預設為 any。此時 key 為 string，value 的 row 為 any
type AnyRow = any

// Row 中值型別可容納 Value 的欄位名，不含 id 與 $ 開頭的系統欄位
export type ColumnKey<Row extends object, Value> = {
  [K in keyof Row & string]: K extends 'id' | `$${string}` ? never : Row[K] extends Value ? K : never
}[keyof Row & string]

// 任一欄位名，用於不限型別之處（例如 labelColumn、detailOrder）
export type RowKey<Row extends object> = ColumnKey<Row, unknown>

// 欄位的基本資訊，真實與虛擬欄位皆以此為基礎。指定 Row 時，key 只能是 Row 中型別相符的欄位
export type ColumnBase<Row extends object = AnyRow, T extends ColumnType = ColumnType> = {
  /** 程式中使用的欄位名，即 Row 介面上的名稱 */
  key: ColumnKey<Row, ColumnValue<T>>
  /** 顯示用的標籤，用於表單、詳細頁與表格的表頭 */
  label: string
  /** 欄位型別，決定值的型別、輸入元件與顯示格式 */
  type: T
  /** 只作用於詳細頁：回傳 false 時此列不顯示此欄 */
  showIf?: (row: Row) => boolean
} & ColumnExtra<T>

// 真實欄位：Sheet 上的欄位，另有表頭對應與表單設定
export type SchemaColumn<Row extends object = AnyRow> = {
  [T in ColumnType]: ColumnBase<Row, T> & {
    /** Sheet 上的實際表頭文字。省略時與 label 相同 */
    sheetHeader?: string
    /** 不可留空。空字串與 null 皆視為空 */
    required?: boolean
    /** 新增表單的初始值。函式於開啟表單時求值 */
    default?: ColumnDefault<ColumnValue<T>>
    /** 自訂規則，於內建檢查通過且有值時呼叫，回傳錯誤訊息或 null */
    validate?: (value: NonNullable<ColumnValue<T>>, row: Row) => string | null
    /** 只對 allowCustom 的 select 有效：接在 options 後的建議值。row 為正在編輯的列，rows 為此表的所有列 */
    suggestedValues?: (row: Row, rows: readonly Row[]) => readonly (string | null | undefined)[]
  }
}[ColumnType]

// 虛擬欄位：不在 Sheet 上，讀取時才計算，由 store 掛為 row 上的 getter（見 docs/topics/schema.md）
export type VirtualColumn<Row extends object = AnyRow> = {
  [T in ColumnType]: ColumnBase<Row, T> & {
    /** 計算方式。父列以 row.$欄位key 讀取，子列以 row.$子表_欄位key 讀取 */
    value: (row: Row) => ColumnValue<T>
    onDelete?: never
    onEmpty?: never
    refSort?: never
    allowCreate?: never
  }
}[ColumnType]

// 真實或虛擬欄位，用於顯示
export type AnyColumn<Row extends object = AnyRow> = SchemaColumn<Row> | VirtualColumn<Row>

export interface SortSpec<Row extends object = AnyRow> {
  /** 排序依據的欄位，真實或虛擬欄位皆可 */
  key: RowKey<Row>
  direction: 'asc' | 'desc'
}

// 各表宣告為 TableSchema<XxxRow>，欄位 key 與 value 的 row 即有型別。框架端一律使用不帶參數的 TableSchema
export interface TableSchema<Row extends object = AnyRow> {
  /** 表於畫面上的名稱（表的 chip、頁籤比對）。Sheet 分頁的名稱只有後端知道 */
  tableLabel: string
  /** 主鍵，須為值為字串的欄位，其值即為 row.id。建立後不可修改（見 docs/topics/schema.md） */
  idColumn: ColumnKey<Row, string | null>
  /** 稱呼一列所用的欄位，真實或虛擬欄位皆可。store 據此掛上 row.$label。省略時為 id */
  labelColumn?: RowKey<Row>
  /** 新增時主鍵留空即以此產生（例如 prefixedId('TPL')）。省略時主鍵為必填 */
  newId?: () => string
  /** Sheet 上的欄位。順序即為表單與詳細頁的預設順序 */
  columns: SchemaColumn<Row>[]
  /** 虛擬欄位，不經過 coerceRow、serializeRow 與表單。顯示、排序與分組的用法與真實欄位相同 */
  virtualColumns?: VirtualColumn<Row>[]
  /** 可搜尋或篩選的欄位，text 與 ref 進搜尋列，其餘進篩選抽屜。順序即為抽屜第一層的順序 */
  searchable?: RowKey<Row>[]
  /** 可排序的欄位，不支援 image。順序即為排序面板的順序 */
  sortable?: RowKey<Row>[]
  /** 詳細頁的欄位順序，省略時依 columns。未列出的欄位不顯示 */
  detailOrder?: RowKey<Row>[]
  /** 表單頁的欄位順序，省略時依 columns */
  formOrder?: RowKey<Row>[]
  /** 列表頁的預設排序，依序作為次要排序。省略或為空陣列時維持 Sheet 上的原始順序 */
  defaultSort?: SortSpec<Row>[]
  /** 條件式格式：條件成立時改變指定欄位的呈現（見 docs/topics/schema.md 的「條件式格式」） */
  formatRules?: FormatRule<Row>[]
}

/** 共用的色名：條件式格式、圖表與文字統計皆使用。文字的色值隨深淺色主題切換，圖表另有一組色值 */
export type ColorName = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'grey'

export interface FormatRule<Row extends object = AnyRow> {
  /** 條件。row 的 getter 已掛上 */
  when: (row: Row) => boolean
  /** 套用的欄位，真實與虛擬欄位皆可 */
  columns: RowKey<Row>[]
  color?: ColorName
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  /** 值前方的圖示（@mdi/js 的 path） */
  icon?: string
  /** 圖示的顏色。省略時與文字同色 */
  iconColor?: ColorName
}

function columnHeader (column: SchemaColumn): string {
  return column.sheetHeader ?? column.label
}

// 主鍵的欄位。idColumn 指向不存在的欄位時拋出錯誤
export function idColumnOf (schema: TableSchema): SchemaColumn {
  const column = schema.columns.find(candidate => candidate.key === schema.idColumn)
  if (!column) {
    throw new Error(`idColumn "${schema.idColumn}" 不在 columns 中`)
  }
  return column
}

// 主鍵於 Sheet 上的表頭，後端以此尋找列
export function idHeader (schema: TableSchema): string {
  return columnHeader(idColumnOf(schema))
}

// 時長接受 H:mm 與 H:mm:ss，省略秒時為 00。分秒超過 59 或格式不符時視為空值
function parseDuration (raw: string): string | null {
  const parts = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(raw.trim())
  return parts ? `${Number(parts[1])}:${parts[2]}:${parts[3] ?? '00'}` : null
}

// 將 "時:分:秒" 換算為秒，供排序與篩選的範圍比較使用
export function durationSeconds (value: unknown): number | null {
  if (typeof value !== 'string') {
    return null
  }
  const parts = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(value)
  return parts ? Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3]) : null
}

// 將秒數換算為 "時:分:秒"，四捨五入至秒
export function formatDuration (seconds: number): string {
  const total = Math.round(seconds)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}`
}

function coerceValue (raw: string, type: ColumnType): string | number | boolean | Date | null {
  if (raw === '') {
    return null
  }

  switch (type) {
    case 'boolean': {
      const text = raw.trim().toUpperCase()
      return text === 'TRUE' ? true : (text === 'FALSE' ? false : null)
    }
    case 'number': {
      const parsed = Number(raw)
      return Number.isNaN(parsed) ? null : parsed
    }
    case 'date': {
      const parsed = new Date(raw)
      if (Number.isNaN(parsed.getTime())) {
        return null
      }
      // 歸零至當天午夜，儲存格含時間時，日期相同的兩列排序與篩選結果才相同
      parsed.setHours(0, 0, 0, 0)
      return parsed
    }
    case 'duration': {
      return parseDuration(raw)
    }
    default: {
      return raw
    }
  }
}

// 依 schema 將後端或 mock 傳回的字串 row 轉為對應的型別
export function coerceRow<Row> (row: Record<string, string>, schema: TableSchema): Row {
  const result: Record<string, unknown> = {
    id: row[idHeader(schema)] ?? '',
  }

  for (const column of schema.columns) {
    result[column.key] = coerceValue(row[columnHeader(column)] ?? '', column.type)
  }

  return result as Row
}

// boolean 的顯示文字，全 App 共用（包含篩選抽屜的選項與摘要）
export function booleanText (value: boolean): string {
  return value ? '是' : '否'
}

// 日期的顯示格式，全 App 共用（包含篩選抽屜的摘要）
export function formatDate (date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

// Sheet 會改變型別的字串（= 與 + 開頭、0 開頭、1/2、1E5）前加單引號，其他值原樣送出（見 docs/topics/schema.md）
const sheetTypeChanging = /^[=+0]|^\d+(?:\.\d+)?e[+-]?\d+$|^\d+(?:\/\d+)+$/i

const sheetTextTypes = new Set<ColumnType>(['text', 'select', 'image'])

function sheetValue (text: string, type: ColumnType): string {
  return sheetTextTypes.has(type) && sheetTypeChanging.test(text) ? `'${text}` : text
}

export function serializeRow (values: Record<string, unknown>, schema: TableSchema): Record<string, string> {
  const result: Record<string, string> = {}

  for (const column of schema.columns) {
    if (column.key in values) {
      result[columnHeader(column)] = sheetValue(formatColumnValue(values, column, 'sheet'), column.type)
    }
  }

  return result
}

// 'display' 為畫面上的文字，'sheet' 為寫回 Sheet 的文字
export type FormatTarget = 'display' | 'sheet'

// 適用於真實與虛擬欄位，虛擬欄位的值為 store 掛在 row 上的 getter
export function formatColumnValue (row: object, column: AnyColumn, target: FormatTarget = 'display'): string {
  const record = row as Record<string, unknown>
  const value = record[column.key]

  if (value === null || value === undefined) {
    return ''
  }

  if (column.type === 'date' && value instanceof Date) {
    return formatDate(value)
  }

  if (column.type === 'boolean' && typeof value === 'boolean') {
    return target === 'sheet' ? String(value).toUpperCase() : booleanText(value)
  }

  // ref 顯示父列的名稱。父列尚未載入或已刪除時顯示 id
  if (column.type === 'ref' && target === 'display') {
    const parent = record[`$${column.key}`] as { $label?: string } | undefined
    return parent?.$label ?? String(value)
  }

  return String(value)
}

// 真實欄位在前，虛擬欄位在後
export function allColumns (schema: TableSchema): AnyColumn[] {
  return [...schema.columns, ...(schema.virtualColumns ?? [])]
}

export function findColumn (schema: TableSchema, key: string): AnyColumn | undefined {
  return allColumns(schema).find(column => column.key === key)
}

// searchable 與 sortable 為 key 的清單，順序即為面板上的順序。略過不存在的 key
export function listedColumns (schema: TableSchema, keys: readonly string[] | undefined): AnyColumn[] {
  const columns = new Map(allColumns(schema).map(column => [column.key, column]))
  return (keys ?? []).map(key => columns.get(key)).filter(column => column !== undefined)
}

// 只有欄位 key、沒有 column 物件時使用（供 rowLabel 使用）
function formatField (row: object, schema: TableSchema, key: string): string {
  const column = findColumn(schema, key)
  return column ? formatColumnValue(row, column) : ''
}

// 一列的名稱：labelColumn 的顯示文字，未設定或為空時為 id。store 以此掛上 row.$label
export function rowLabel (row: object, schema: TableSchema): string {
  const label = schema.labelColumn ? formatField(row, schema, schema.labelColumn) : ''
  return label || String((row as { id?: unknown }).id ?? '')
}

// 沒有 default 的欄位為 null。default 為函式時於此處求值
function columnDefault (column: SchemaColumn): unknown {
  const value = column.default
  return typeof value === 'function' ? value() : value ?? null
}

// 供 schema 的 newId 使用：前綴加 8 碼十六進位隨機值（例如 TPL-11eef1a8）
export function prefixedId (prefix: string): () => string {
  return () => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

// 依 schema 產生新增表單的初始列。id 留空，送出時取主鍵的值，主鍵為空時才產生
export function emptyRow<Row> (schema: TableSchema): Row {
  const result: Record<string, unknown> = { id: '' }

  for (const column of schema.columns) {
    result[column.key] = columnDefault(column)
  }

  return result as Row
}

// 將 row 轉為 { columnKey: 值 }，只含真實欄位（含主鍵，不含系統的 id）。用於 create 與 update 的 payload
export function columnValues (row: object, schema: TableSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const column of schema.columns) {
    result[column.key] = (row as Record<string, unknown>)[column.key]
  }
  return result
}
