// 新增與刪除表：表的檔案、輸入的檢查與刪除的範圍
import { actionsFileOf, TABLES_DIR } from './tableKeys.ts'

export const PAGES_DIR = 'vue-build/src/pages/'
// 各表的 mock CSV 的登記
export const MOCK_TABLES_FILE = 'vue-build/src/services/mock/tables.ts'

export interface NewTableRequest {
  key: string
  /** tableLabel */
  label: string
  /** 主鍵的字首，例如 ORD。虛擬表不使用 */
  prefix: string
  /** 虛擬表：由虛擬表的範本建立，沒有 mock CSV */
  virtual: boolean
}

export interface NewTableResult {
  /** 新建的檔案 */
  created: string[]
}

export interface DeleteTableResult {
  /** 刪除的檔案 */
  deleted: string[]
}

export function schemaFileOf (key: string): string {
  return `${TABLES_DIR}${key}.ts`
}

export function mockCsvFileOf (key: string): string {
  return `vue-build/mock/${key}-test.csv`
}

const TABLE_KEY = /^[a-z][a-z\d]*$/i

/** 表的代號不可使用時的原因。可以使用時為 null */
export function tableKeyError (key: string, existing: Iterable<string>): string | null {
  if (key === '') {
    return '請輸入代號。'
  }
  if (!TABLE_KEY.test(key) || key.charAt(0) !== key.charAt(0).toLowerCase()) {
    return '代號只能使用英文字母與數字，且第一個字為小寫英文字母。'
  }
  return new Set(existing).has(key) ? `已有表 ${key}。` : null
}

/** 主鍵的字首不可使用時的原因。可以使用時為 null */
export function idPrefixError (prefix: string): string | null {
  if (prefix === '') {
    return '請輸入主鍵字首。'
  }
  return /^[A-Z\d]+$/.test(prefix) ? null : '主鍵字首只能使用大寫英文字母與數字。'
}

/** 刪除表時一併刪除的檔案：schema、動作、頁面的資料夾、其他表中此表的展開頁，以及 mock CSV */
export function tableDeletionFiles (key: string, paths: readonly string[], mockCsv: Readonly<Record<string, string>>): string[] {
  const expanded = new RegExp(String.raw`^vue-build/src/pages/\w+/\[id\]/${key}\.vue$`)
  const files = paths.filter(path => path === schemaFileOf(key)
    || path === actionsFileOf(key)
    || path.startsWith(`${PAGES_DIR}${key}/`)
    || expanded.test(path)
    || path === mockCsv[key])
  return files.toSorted()
}

/** mock CSV 的登記：表的代號對應 CSV 的路徑 */
export interface MockTablesModel {
  csv: Record<string, string>
}

/** 對 mock CSV 的登記的一項修改。add 加於最後，並加上 CSV 的匯入。remove 一併刪除不再使用的匯入 */
export type MockTablesEdit
  = | { kind: 'add', key: string, csvPath: string }
    | { kind: 'remove', key: string }

export interface MockTablesEditRequest {
  text: string
  edits: MockTablesEdit[]
}

export interface MockTablesEditResult {
  text: string
  model: MockTablesModel | null
}

export function isMockCsvFile (filePath: string): boolean {
  return /^vue-build\/mock\/[^/]+\.csv$/.test(filePath)
}

/** CSV 對應的表：登記此 CSV 的表，沒有時為檔名 <代號>-test.csv 的表。都沒有時為 null */
export function tableOfCsv (filePath: string, mockCsv: Readonly<Record<string, string>>, tableKeys: Iterable<string>): string | null {
  const registered = Object.entries(mockCsv).find(([, file]) => file === filePath)?.[0]
  return registered ?? [...tableKeys].find(key => mockCsvFileOf(key) === filePath) ?? null
}
