// schema/index.ts 的 schemas 的解析結果與修改，服務與介面共用

export interface RegistryEntry {
  /** 表的代號。不是以名稱直接寫成時為 null */
  key: string | null
  /** schema 的變數名。不是以變數直接寫成時為 null */
  variable: string | null
}

export interface RegistryModel {
  /** 依 schemas 中的順序 */
  entries: RegistryEntry[]
}

/** 對 schemas 的一項修改。add 加於 before 之前，沒有 before 時加於最後，並加上 schema 的 import。remove 一併刪除 import */
export type RegistryEdit
  = | { kind: 'move', from: number, to: number }
    | { kind: 'add', key: string, variable: string, before?: string }
    | { kind: 'remove', key: string }

export interface RegistryEditRequest {
  text: string
  edits: RegistryEdit[]
}

export interface RegistryEditResult {
  text: string
  model: RegistryModel | null
}

/** 新增登記時置於其前的表：真實表置於第一張虛擬表之前，虛擬表置於最後（undefined） */
export function registryAddBefore (model: RegistryModel, isVirtual: (key: string) => boolean, virtual: boolean): string | undefined {
  return virtual ? undefined : model.entries.find(entry => entry.key !== null && isVirtual(entry.key))?.key ?? undefined
}
