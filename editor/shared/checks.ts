// 問題分頁與建置的資料形狀。問題來自四個來源，路徑相對於 repo 根目錄，以 / 分隔

/** ts 為即時檢查（未儲存的內容），eslint 為存檔時的 ESLint，vue-tsc 為背景的型別檢查，vite 為預覽的 Vite 錯誤 */
export type ProblemSource = 'ts' | 'eslint' | 'vue-tsc' | 'vite'

export interface Problem {
  source: ProblemSource
  /** 不在 repo 中的檔案為絕對路徑。與檔案無關的問題為 null */
  path: string | null
  /** 行與欄從 1 起算。沒有位置時為 null */
  position: { line: number, column: number } | null
  severity: 'error' | 'warning' | 'info'
  message: string
  /** 例如 TS2322 或 ESLint 的規則名稱 */
  code: string | null
}

export interface VueTscStatus {
  /** starting 為第一次檢查，checking 為檔案修改後的檢查 */
  state: 'starting' | 'checking' | 'done' | 'failed'
  problems: Problem[]
  /** vue-tsc 停止時的輸出 */
  error: string | null
}

export type BuildState = 'idle' | 'running' | 'succeeded' | 'failed'

// 建置的輸出只保留最近的行數
export const MAX_BUILD_LINES = 2000

export interface BuildStatus {
  state: BuildState
  /** 最近一次建置的輸出 */
  lines: string[]
}

export interface ChecksSnapshot {
  eslint: Problem[]
  vueTsc: VueTscStatus
  build: BuildStatus
}

export type BuildEvent
  = | { kind: 'state', state: BuildState }
    | { kind: 'output', text: string }

// 服務經由 Vite 的 websocket 推送的事件名稱
export const ESLINT_EVENT = 'editor:eslint'
export const VUE_TSC_EVENT = 'editor:vue-tsc'
export const BUILD_EVENT = 'editor:build'
