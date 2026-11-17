// 文字編輯器與 TypeScript language service 之間的資料形狀。位置為文字中的 UTF-16 位移

export interface CodeDiagnostic {
  from: number
  to: number
  severity: 'error' | 'warning' | 'info'
  message: string
  /** TypeScript 的錯誤代碼，例如 2322 */
  code: number
}

export interface CodeCompletionEntry {
  name: string
  /** TypeScript 的 ScriptElementKind，例如 property、method */
  kind: string
  sortText: string
  /** 與 name 不同時，插入此文字 */
  insertText?: string
}

export interface CodeCompletions {
  /** 取代範圍的起點。null 時由編輯器依游標前的字決定 */
  from: number | null
  entries: CodeCompletionEntry[]
}

export interface CodeRequest {
  path: string
  /** 編輯中的內容，可能尚未儲存 */
  text: string
}

export interface CompletionRequest extends CodeRequest {
  pos: number
}

// vue-build/src 中的 .ts 與 .vue 檔有診斷與補全
export function hasTypeScriptService (filePath: string): boolean {
  return filePath.startsWith('vue-build/src/') && /\.(?:ts|vue)$/.test(filePath)
}
