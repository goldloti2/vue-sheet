// 新增與刪除表：表的檔案、輸入的檢查與刪除的範圍
import { actionsFileOf, TABLES_DIR } from './tableKeys.ts'

export const PAGES_DIR = 'vue-build/src/pages/'
// 各表的 mock CSV 的登記
export const MOCK_TABLES_FILE = 'vue-build/src/services/mock/tables.ts'

export interface NewTableRequest {
  key: string
  /** tableLabel */
  label: string
  /** 主鍵的字首，例如 ORD */
  prefix: string
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
