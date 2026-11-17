// 編輯器的服務與介面之間的資料形狀。路徑一律相對於 repo 根目錄，以 / 分隔

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
}

export interface TableSummary {
  /** tableLabel。不是以字串直接寫值時為 null */
  label: string | null
  columns: TableColumn[]
}

/** 專案的檔案清單，以及各表的名稱與欄位 */
export interface ProjectIndex {
  paths: string[]
  /** 表的代號（檔名）對應表名與欄位 */
  tables: Record<string, TableSummary>
}

export interface FileChangedEvent {
  path: string
  /** 修改後的 hash，檔案已刪除時為 null */
  hash: string | null
}

// 服務經由 Vite 的 websocket 推送的事件名稱
export const FILE_CHANGED_EVENT = 'editor:file-changed'
export const PROJECT_INDEX_EVENT = 'editor:project-index'
