// 預覽的資料形狀。預覽為 vue-build 的 dev server，於子程序中執行

import type { Problem } from './checks.ts'

/** mock 為本地測試（假後端），fake 為線上測試（vue-build/.env.fake.local 中的 Sheet），sheet 為線上正式（vue-build/.env 中的 Sheet） */
export type PreviewSource = 'mock' | 'sheet' | 'fake'

export const PREVIEW_SOURCES: readonly PreviewSource[] = ['mock', 'fake', 'sheet']

export interface PreviewStatus {
  source: PreviewSource
  state: 'starting' | 'running' | 'error'
  /** 預覽的網址。尚未啟動時為 null */
  url: string | null
  error: string | null
  /** 各資料來源能否使用。不能使用時為原因 */
  unavailable: Partial<Record<PreviewSource, string>>
}

export interface ConsoleEntry {
  /** page 為預覽頁面中的 console 與錯誤，server 為 dev server 的輸出 */
  origin: 'page' | 'server'
  level: 'info' | 'warn' | 'error'
  text: string
  time: number
}

/** 預覽改用未儲存的內容。text 為 null 時改回檔案的內容 */
export interface PreviewDraft {
  path: string
  text: string | null
}

// 預覽頁面與編輯器之間的 postMessage
export const PREVIEW_MESSAGE_TAG = 'vue-sheet-preview'

export type PreviewPageMessage
  = | { tag: typeof PREVIEW_MESSAGE_TAG, kind: 'console', level: ConsoleEntry['level'], text: string }
  /** Vite 一次只有一個錯誤。problem 為 null 時錯誤已消除 */
    | { tag: typeof PREVIEW_MESSAGE_TAG, kind: 'vite-error', problem: Problem | null }

export type PreviewCommand
  = | { tag: typeof PREVIEW_MESSAGE_TAG, kind: 'reload' }

export const PREVIEW_STATUS_EVENT = 'editor:preview-status'
export const PREVIEW_LOG_EVENT = 'editor:preview-log'
