// 新增表單的初始值。給函式的話是打開表單那一刻才求值
export type ColumnDefault<T> = T | (() => T)

// 每張表的 Row 介面都 extends 這個：id 是系統欄位，$label 是 store 掛的 getter（見 labelColumn）
export interface RowBase {
  id: string
  readonly $label: string
}

// 每種欄位型別只在這裡定義一次：值的型別 + 這種型別專屬的設定。真實與虛擬欄位都從這張表推導
interface ColumnTypes {
  text: { value: string | null }
  number: { value: number | null, extra: { min?: number, max?: number } }
  date: { value: Date | null }
  // 外鍵欄位（見文件 4.2 節一對多關聯慣例）；refTable 對應 schema/index.ts 的 schemas 裡的 key。
  // 顯示時用對方的 $label（對方 schema 的 labelColumn），store 會把對方那一列掛成 row.$欄位key。
  // onDelete: 'cascade' 表示對方那一列被刪時，指向它的這些列也一起刪；不標就留著（ref 指向不存在的 id）
  ref: { value: string | null, extra: { refTable: string, onDelete?: 'cascade' } }
  // 清單類欄位：只能是 options 裡的其中一個值
  select: { value: string | null, extra: { options: string[] } }
}

export type ColumnType = keyof ColumnTypes
export type ColumnValue<T extends ColumnType> = ColumnTypes[T]['value']
type ColumnExtra<T extends ColumnType> = ColumnTypes[T] extends { extra: infer Extra } ? Extra : object

// 框架端不知道也不在乎是哪張表的 Row，所以預設是 any：key 退化成 string、value 的 row 退化成 any。
// 不用 object 是因為 keyof Row 讓 TS 把 Row 判成逆變，TableSchema<XxxRow> 會塞不進 TableSchema<object>
type AnyRow = any

// Row 裡值型別放得下 Value 的欄位名；id 與 $ 開頭的系統欄位不算
type ColumnKey<Row extends object, Value> = {
  [K in keyof Row & string]: K extends 'id' | `$${string}` ? never : Row[K] extends Value ? K : never
}[keyof Row & string]

// 任一欄位名，給 labelColumn / detailOrder 這種不挑型別的地方
export type RowKey<Row extends object> = ColumnKey<Row, unknown>

// 一個欄位最基本的資訊：key、label、型別、型別專屬設定。真實與虛擬欄位都疊在這上面。
// 帶 Row 時 key 只能是 Row 裡型別相符的欄位（type: 'number' 只能綁 number | null 的欄位）
export type ColumnBase<Row extends object = AnyRow, T extends ColumnType = ColumnType> = {
  key: ColumnKey<Row, ColumnValue<T>>
  label: string
  type: T
} & ColumnExtra<T>

// 真實欄位：Sheet 上有的，多了表頭對應與表單設定
export type SchemaColumn<Row extends object = AnyRow> = {
  [T in ColumnType]: ColumnBase<Row, T> & {
    // 省略時預設跟 label 同值（見《GoogleSheet後端App-通用架構》文件 6.6 節）
    sheetHeader?: string
    required?: boolean
    default?: ColumnDefault<ColumnValue<T>>
    // 設計者自訂的規則：內建檢查過了、而且有值時才叫，回錯誤訊息或 null。
    validate?: (value: NonNullable<ColumnValue<T>>, row: Row) => string | null
  }
}[ColumnType]

// 虛擬欄位：不在 Sheet 上、讀的時候才算。store 會把它掛成 row 上的 getter，讀起來跟真實欄位一樣（見 README 4.5）。
// 父表走 row.$欄位key、子表走 row.$子表_欄位key，都是 store 掛好的，value 直接讀
export type VirtualColumn<Row extends object = AnyRow> = {
  [T in ColumnType]: ColumnBase<Row, T> & {
    value: (row: Row) => ColumnValue<T>
  }
}[ColumnType]

// 顯示用：兩種欄位一起看的時候
export type AnyColumn<Row extends object = AnyRow> = SchemaColumn<Row> | VirtualColumn<Row>

export interface SortSpec<Row extends object = AnyRow> {
  key: RowKey<Row>
  direction: 'asc' | 'desc'
}

// 各表宣告成 TableSchema<XxxRow>，欄位 key 與 value 的 row 就有型別；框架端一律用不帶參數的 TableSchema 接
export interface TableSchema<Row extends object = AnyRow> {
  // 對應 Google Sheet 分頁的實際名稱，也是打 API 時 table= 的值
  sheetName: string
  // 這張表的 ID 欄（sheetHeader 值）。系統欄位，不放進 columns（見文件 6.5 節）
  idColumn: string
  // 用哪一欄稱呼一列（欄位 key，真實或虛擬都行），store 據此掛 row.$label；別的表 ref 到這裡就顯示它。省略就是 id
  labelColumn?: RowKey<Row>
  // 怎麼發一筆新 id，由各表自己決定。常見的前綴式用 prefixedId('TPL')
  newId: () => string
  columns: SchemaColumn<Row>[]
  // 算出來的欄位，不進 coerceRow / serializeRow / 表單；顯示、排序、分組都跟真實欄位一樣用
  virtualColumns?: VirtualColumn<Row>[]
  // detail 頁的顯示順序（欄位 key 陣列）。省略時沿用 columns 的順序
  detailOrder?: RowKey<Row>[]
  // 表單頁的欄位順序（欄位 key 陣列）。省略時沿用 columns 的順序；
  formOrder?: RowKey<Row>[]
  // 列表頁預設排序，多筆依序當 tiebreaker。省略/空陣列 = 維持原始（row number）順序
  defaultSort?: SortSpec<Row>[]
}

function columnHeader (column: SchemaColumn): string {
  return column.sheetHeader ?? column.label
}

function coerceValue (raw: string, type: ColumnType): string | number | Date | null {
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

// 真實與虛擬欄位都能用：虛擬欄位的值是 store 掛在 row 上的 getter
export function formatColumnValue (row: object, column: AnyColumn): string {
  const record = row as Record<string, unknown>
  const value = record[column.key]

  if (value === null || value === undefined) {
    return ''
  }

  if (column.type === 'date' && value instanceof Date) {
    return formatDate(value)
  }

  // ref 顯示對方的名字；對方還沒載或已被刪就退回 id
  if (column.type === 'ref') {
    const parent = record[`$${column.key}`] as { $label?: string } | undefined
    return parent?.$label ?? String(value)
  }

  return String(value)
}

// 真實欄位在前、虛擬欄位在後
export function allColumns (schema: TableSchema): AnyColumn[] {
  return [...schema.columns, ...(schema.virtualColumns ?? [])]
}

export function findColumn (schema: TableSchema, key: string): AnyColumn | undefined {
  return allColumns(schema).find(column => column.key === key)
}

// 只知道欄位 key、還沒有 column 物件時用這個（例如列表頁只想挑幾個欄位顯示）
export function formatField (row: object, schema: TableSchema, key: string): string {
  const column = findColumn(schema, key)
  return column ? formatColumnValue(row, column) : ''
}

// 一列怎麼稱呼：schema 的 labelColumn 那欄的顯示文字，沒設或空的就是 id。store 用它掛 row.$label
export function rowLabel (row: object, schema: TableSchema): string {
  const label = schema.labelColumn ? formatField(row, schema, schema.labelColumn) : ''
  return label || String((row as { id?: unknown }).id ?? '')
}

// 沒有 default 的欄位是 null；有的話套上去，函式型的在這裡才求值
function columnDefault (column: SchemaColumn): unknown {
  const value = column.default
  return typeof value === 'function' ? value() : value ?? null
}

// 給 schema 的 newId 用的現成產生器：前綴 + 8 碼十六進位隨機值（TPL-11eef1a8）。
export function prefixedId (prefix: string): () => string {
  return () => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

// 依 schema 產生一筆 row 給新增表單當初始值；id 留空，送出時才發
export function emptyRow<Row> (schema: TableSchema): Row {
  const result: Record<string, unknown> = { id: '' }

  for (const column of schema.columns) {
    result[column.key] = columnDefault(column)
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
