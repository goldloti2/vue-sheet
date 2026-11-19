// schema 檔的解析結果與修改，服務與介面共用。位置皆為文字中的 UTF-16 位移
import type { FileContent } from './api.ts'

export interface TextRange {
  from: number
  to: number
}

export type SchemaValue = TextRange & (
  | { kind: 'string', value: string }
  | { kind: 'number', value: number }
  | { kind: 'boolean', value: boolean }
  | { kind: 'array', items: SchemaValue[] }
  | { kind: 'object', properties: SchemaProperty[] }
  /** 例如 prefixedId('TPL') */
  | { kind: 'call', callee: string, args: SchemaValue[] }
  /** 其他寫法，例如函數、變數或運算式 */
  | { kind: 'code', text: string }
)

export type ObjectValue = Extract<SchemaValue, { kind: 'object' }>
export type ArrayValue = Extract<SchemaValue, { kind: 'array' }>

export interface SchemaProperty extends TextRange {
  /** 展開（...）等沒有名稱的寫法為 null */
  name: string | null
  value: SchemaValue
}

export interface RowMember extends TextRange {
  name: string
  /** 型別的原文，例如 string | null */
  type: string
  readonly: boolean
  optional: boolean
}

export interface RowInterface extends TextRange {
  name: string
  members: RowMember[]
}

export interface SchemaModel {
  /** schema 的變數名，例如 orderSchema */
  variable: string | null
  schema: ObjectValue | null
  row: RowInterface | null
}

/** schema 物件中的位置：字串為屬性名，數字為陣列的索引 */
export type SchemaPath = readonly (string | number)[]

const IDENTIFIER = /^[a-z_$][\w$]*$/i

// 字面值的原文。字串使用單引號
export function literalText (value: string | number | boolean | readonly string[]): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => literalText(item)).join(', ')}]`
  }
  if (typeof value === 'string') {
    return `'${value.replaceAll('\\', '\\\\').replaceAll('\'', String.raw`\'`).replaceAll('\n', String.raw`\n`)}'`
  }
  return String(value)
}

// 屬性名的原文。不是識別字時加上引號
export function propertyKeyText (name: string): string {
  return IDENTIFIER.test(name) ? name : literalText(name)
}

// 物件中的屬性值。不是物件或沒有此屬性時為 undefined
export function propertyValue (value: SchemaValue | null | undefined, name: string): SchemaValue | undefined {
  return value?.kind === 'object' ? value.properties.find(property => property.name === name)?.value : undefined
}

// 以字串直接寫值時回傳字串，其他寫法回傳 null
export function stringValue (value: SchemaValue | undefined): string | null {
  return value?.kind === 'string' ? value.value : null
}

/** 設定於表單中的輸入方式，依設定的型別決定 */
export type OptionControl
  = | { kind: 'boolean' }
    | { kind: 'number' }
    | { kind: 'string' }
    /** 字串字面值的聯集 */
    | { kind: 'choice', values: string[] }
    /** 字串的陣列 */
    | { kind: 'strings' }
    /** 一個欄位的 key（RowKey、ColumnKey） */
    | { kind: 'column' }
    /** 欄位的 key 的陣列 */
    | { kind: 'columns' }
    /** 函數與其他型別，以程式碼輸入 */
    | { kind: 'code' }

export interface SettingOption {
  name: string
  /** 型別的原文 */
  typeText: string
  optional: boolean
  /** JSDoc 的說明 */
  doc: string | null
  control: OptionControl
}

export interface ColumnTypeInfo {
  /** 例如 text、number */
  name: string
  /** 值的型別的原文，例如 string | null */
  valueType: string
  doc: string | null
  options: SettingOption[]
}

/** types.ts 中表單所需的型別：各欄位型別，以及條件式格式（FormatRule）的各項設定 */
export interface SchemaTypes {
  columnTypes: ColumnTypeInfo[]
  formatRule: SettingOption[]
  /** 欄位的各項設定的說明，例如 default、value */
  columnDocs: Record<string, string>
  /** TableSchema 的各項設定的說明，例如 newId */
  schemaDocs: Record<string, string>
  /** 共用色名（例如 vuesheet-red）於淺色與深色主題的色值，取自 vue-build/src/plugins/colors.ts */
  colors: { light: Record<string, string>, dark: Record<string, string> }
}

export interface NewColumn {
  key: string
  label: string
  /** 欄位型別，例如 text */
  type: string
  virtual: boolean
}

/** 對 schema 檔的一項修改。valueText 與 itemText 為程式碼的原文。code 為 true 時，寫入前檢查 valueText 是否為一個運算式 */
export type SchemaEdit
  = | { kind: 'replace', path: SchemaPath, valueText: string, code?: boolean }
  /** valueText 為 null 時刪除屬性。不存在的屬性置於 after 之後 */
    | { kind: 'setProperty', objectPath: SchemaPath, name: string, valueText: string | null, after?: string, code?: boolean }
    | { kind: 'insert', arrayPath: SchemaPath, index: number, itemText: string, multiline?: boolean }
    | { kind: 'remove', arrayPath: SchemaPath, index: number }
    | { kind: 'move', arrayPath: SchemaPath, from: number, to: number }
    | { kind: 'setColumnType', key: string, type: string }
  /** 新增欄位與 Row 的成員 */
    | { kind: 'addColumn', column: NewColumn }
  /** 刪除欄位、Row 的成員，以及同一檔案中以字面值寫成的引用 */
    | { kind: 'removeColumn', key: string }
  /** 沒有此具名匯入時加上 */
    | { kind: 'ensureImport', name: string, from: string }

export interface SchemaEditRequest {
  text: string
  /** 依序套用 */
  edits: SchemaEdit[]
}

export interface SchemaEditResult {
  text: string
  model: SchemaModel
}

/** 程式碼輸入框的前後文：把輸入框的內容置於 prefix 與 suffix 之間，即為整個檔案 */
export interface CodeContext {
  prefix: string
  suffix: string
}

export interface CodeContextRequest {
  text: string
  objectPath: SchemaPath
  name: string
}

/** 修改欄位的 key。drafts 為其他檔案未儲存的內容 */
export interface KeyRenameRequest {
  path: string
  text: string
  oldKey: string
  newKey: string
  drafts: { path: string, text: string }[]
}

/** 其他檔案修改後的內容。base 為修改前磁碟上的內容，以未儲存的內容修改時為 null */
export interface FileRewrite {
  path: string
  text: string
  base: FileContent | null
}

/** text 為 schema 檔修改後的內容 */
export interface KeyRenameResult {
  text: string
  others: FileRewrite[]
}

const COLUMN_KEY = /^[a-z_]\w*$/i

/** 欄位的 key 不可使用時的原因。可以使用時為 null */
export function columnKeyError (key: string, existing: Iterable<string>): string | null {
  if (key === '') {
    return '請輸入 key。'
  }
  if (!COLUMN_KEY.test(key)) {
    return 'key 只能使用英文字母、數字與底線，且第一個字不可為數字。'
  }
  if (key === 'id') {
    return 'id 為每一列共有的屬性，不可作為欄位的 key。'
  }
  return new Set(existing).has(key) ? `已有欄位 ${key}。` : null
}
