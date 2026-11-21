// apps-script/Config.gs 的解析結果與修改，服務與介面共用
import type { TableSummary } from './api.ts'

export const CONFIG_FILE = 'apps-script/Config.gs'

/** 以字面值寫成時為 value，其他寫法為 code，沒有此設定時為 null */
export type ConfigValue<T> = { kind: 'value', value: T } | { kind: 'code', text: string } | null

/** TABLES 中的一項。項目不是物件字面值時，sheetName 與 idColumn 皆為整項的原文 */
export interface ConfigTable {
  /** 表的代稱。不是以名稱直接寫成時為 null */
  key: string | null
  sheetName: ConfigValue<string>
  /** Sheet 中主鍵欄的表頭 */
  idColumn: ConfigValue<string>
}

export interface ConfigModel {
  /** 依 TABLES 中的順序。找不到 TABLES 物件時為 null */
  tables: ConfigTable[] | null
  /** HEADER_ROW */
  headerRow: ConfigValue<number>
  /** LOCK_TIMEOUT_MS 換算的秒數。N * 1000 與只寫數字以外的寫法為 code */
  lockTimeout: ConfigValue<number>
  /** AUTH。null 為不須登入 */
  auth: ConfigValue<string | null>
}

/** 對 Config.gs 的一項修改。addTable 加於 TABLES 的最後，已有此表時不修改。renameIdColumn 只在 idColumn 以字面值寫成且等於 oldHeader 時修改 */
export type ConfigEdit
  = | { kind: 'setTable', key: string, name: 'sheetName' | 'idColumn', value: string }
    | { kind: 'addTable', key: string, sheetName: string, idColumn: string }
    | { kind: 'removeTable', key: string }
    | { kind: 'renameIdColumn', key: string, oldHeader: string, header: string }
    | { kind: 'setHeaderRow', value: number }
    | { kind: 'setLockTimeout', seconds: number }
    | { kind: 'setAuth', value: string | null }

export interface ConfigEditRequest {
  text: string
  edits: ConfigEdit[]
}

export interface ConfigEditResult {
  text: string
  model: ConfigModel
}

/** TABLES 中以字面值寫成的值。以程式碼寫成的值為 null */
export interface ConfigTableEntry {
  sheetName: string | null
  idColumn: string | null
}

/** 寫入 Config.gs 後的提示 */
export const CONFIG_DEPLOY_MESSAGE = 'Config.gs 的修改須以 clasp push 推送並更新部署才會生效。步驟見 apps-script/README.md 的「部署步驟」。'

/** Config.gs 的表單中的一列 */
export interface ConfigRow {
  /** 表的代稱。TABLES 中不是以名稱直接寫成時為 null */
  key: string | null
  /** 表名。找不到表時為 null */
  label: string | null
  /** TABLES 中的登記。沒有登記時為 null */
  table: ConfigTable | null
  /** schema 中主鍵欄的表頭。找不到表或主鍵欄時為 null */
  idHeader: string | null
  /** TABLES 中有登記，但沒有對應的真實表 */
  orphan: boolean
}

export interface ConfigRowSource {
  tables: Readonly<Record<string, TableSummary>>
  tableOrder: readonly string[]
}

/** schema 中主鍵欄的表頭。找不到時為 null */
export function idHeaderOf (summary: TableSummary | undefined): string | null {
  return summary?.columns.find(column => column.key === summary.idColumn)?.header ?? null
}

/** 真實表依 schemas 的順序在前，未登記於 schemas 的表依代號在後。TABLES 中沒有對應真實表的項目排在最後 */
export function configRows (tables: readonly ConfigTable[], { tables: summaries, tableOrder }: ConfigRowSource): ConfigRow[] {
  const real = Object.keys(summaries).filter(key => !summaries[key]!.virtual)
  const ordered = [
    ...tableOrder.filter(key => real.includes(key)),
    ...real.filter(key => !tableOrder.includes(key)).toSorted(),
  ]
  const rows = ordered.map((key): ConfigRow => ({
    key,
    label: summaries[key]!.label,
    table: tables.find(table => table.key === key) ?? null,
    idHeader: idHeaderOf(summaries[key]),
    orphan: false,
  }))
  const orphans = tables
    .filter(table => table.key === null || !real.includes(table.key))
    .map((table): ConfigRow => ({ key: table.key, label: null, table, idHeader: null, orphan: true }))
  return [...rows, ...orphans]
}

/** TABLES 的 idColumn 與 schema 中主鍵欄的表頭不同 */
export function idColumnMismatch (row: ConfigRow): boolean {
  return row.table?.idColumn?.kind === 'value' && row.idHeader !== null && row.table.idColumn.value !== row.idHeader
}
