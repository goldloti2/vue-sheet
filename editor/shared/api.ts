// 編輯器的服務與介面之間的資料形狀。路徑一律相對於 repo 根目錄，以 / 分隔
import type { ConfigTableEntry } from './configGs.ts'
import type { NavLink } from './navigationForm.ts'

export interface FileContent {
  path: string
  text: string
  hash: string
}

export interface WriteRequest {
  path: string
  text: string
  /** 讀取時的 hash。null 為新建檔案，檔案已存在時視為衝突 */
  baseHash: string | null
}

export type WriteResult
  = | { ok: true, file: FileContent }
  /** 檔案已在別處修改。file 為目前的內容，檔案已刪除時為 null */
    | { ok: false, file: FileContent | null }

/** schema 中以字面值寫成的欄位。其他寫法的屬性為 null */
export interface TableColumn {
  key: string
  label: string | null
  type: string | null
  /** 列於 virtualColumns 的欄位 */
  virtual: boolean
  /** Sheet 的表頭（sheetHeader，省略時為 label）。虛擬欄位、虛擬表的欄位與不是以字串直接寫值時為 null */
  header: string | null
  /** ref 欄位指向的表的代號。其他欄位與不是以字串直接寫值時為 null */
  refTable: string | null
}

export interface TableSummary {
  /** tableLabel。不是以字串直接寫值時為 null */
  label: string | null
  /** schema 的變數名，例如 orderSchema。找不到時為 null */
  variable: string | null
  /** 虛擬表：schema 物件有 rules */
  virtual: boolean
  /** 主鍵欄的 key。不是以字串直接寫值或沒有此設定時為 null */
  idColumn: string | null
  columns: TableColumn[]
}

/** 專案的檔案清單，以及各表的名稱與欄位 */
export interface ProjectIndex {
  paths: string[]
  /** 表的代號（檔名）對應表名與欄位 */
  tables: Record<string, TableSummary>
  /** schemas 中依序登記的表的代號 */
  tableOrder: string[]
  /** 表的代號對應 services/mock/tables.ts 中登記的 CSV 的路徑 */
  mockCsv: Record<string, string>
  /** apps-script/Config.gs 的 TABLES 中各表的值。沒有 Config.gs 或找不到 TABLES 物件時為 null */
  configTables: Record<string, ConfigTableEntry> | null
  /** config/navigation.ts 中以字面值寫成的項目。沒有 navigation.ts 時為 null */
  navLinks: NavLink[] | null
  /** mock/ 中各 CSV 的路徑對應資料的列數，不含表頭 */
  csvRows: Record<string, number>
}

export interface FileChangedEvent {
  path: string
  /** 修改後的 hash，檔案已刪除時為 null */
  hash: string | null
}

// 服務經由 Vite 的 websocket 推送的事件名稱
export const FILE_CHANGED_EVENT = 'editor:file-changed'
export const PROJECT_INDEX_EVENT = 'editor:project-index'
