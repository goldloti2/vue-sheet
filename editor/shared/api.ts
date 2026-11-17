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

/** 專案的檔案清單，以及各表的名稱 */
export interface ProjectIndex {
  paths: string[]
  /** 表的代號（檔名）對應 tableLabel。讀不到 tableLabel 的表不列入 */
  tableLabels: Record<string, string>
}

export interface FileChangedEvent {
  path: string
  /** 修改後的 hash，檔案已刪除時為 null */
  hash: string | null
}

// 服務經由 Vite 的 websocket 推送的事件名稱
export const FILE_CHANGED_EVENT = 'editor:file-changed'
export const PROJECT_INDEX_EVENT = 'editor:project-index'
