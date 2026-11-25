// 總覽的各列：schemas 中登記的表依其順序在前，有 schema 檔但未登記的表在後
import type { TableSummary } from './api.ts'
import type { RegistryModel } from './registry.ts'
import type { MockTablesModel } from './tableFiles.ts'
import { isMockCsvFile, mockCsvFileOf } from './tableFiles.ts'
import { actionsFileOf, tableKeyOf, TABLES_DIR } from './tableKeys.ts'

/** 表的各個檔案。沒有時為 null */
export interface TableFiles {
  schema: string | null
  actions: string | null
  /** 預設頁。沒有預設頁時為詳細頁，再沒有時為資料夾中的第一個頁面 */
  pages: string | null
  csv: string | null
}

export interface OverviewRow {
  /** 表的代號。登記不是以名稱直接寫成時為 null */
  key: string | null
  /** schemas 中的位置。未登記時為 null */
  index: number | null
  /** schema 的變數名。找不到時為 null */
  variable: string | null
  label: string | null
  files: TableFiles
}

export interface OverviewSource {
  paths: readonly string[]
  tables: Readonly<Record<string, TableSummary>>
  mockCsv: Readonly<Record<string, string>>
}

function filesOf (key: string, { paths, mockCsv }: OverviewSource): TableFiles {
  const exists = (path: string) => paths.includes(path) ? path : null
  const folder = `vue-build/src/pages/${key}/`
  const pages = paths.filter(path => path.startsWith(folder)).toSorted()
  return {
    schema: exists(`${TABLES_DIR}${key}.ts`),
    actions: exists(actionsFileOf(key)),
    pages: pages.find(path => path === `${folder}index.vue`) ?? pages.find(path => path === `${folder}[id]/index.vue`) ?? pages[0] ?? null,
    csv: mockCsv[key] ?? null,
  }
}

export function overviewRows (model: RegistryModel, source: OverviewSource): OverviewRow[] {
  const row = (key: string | null, index: number | null, variable: string | null): OverviewRow => ({
    key,
    index,
    variable: variable ?? (key === null ? null : source.tables[key]?.variable ?? null),
    label: key === null ? null : source.tables[key]?.label ?? null,
    files: key === null ? { schema: null, actions: null, pages: null, csv: null } : filesOf(key, source),
  })
  const registered = new Set(model.entries.map(entry => entry.key))
  const unregistered = source.paths
    .map(path => tableKeyOf(path))
    .filter((key): key is string => key !== null && !registered.has(key))
    .toSorted()
  return [
    ...model.entries.map((entry, index) => row(entry.key, index, entry.variable)),
    ...unregistered.map(key => row(key, null, null)),
  ]
}

export interface MockOverviewRow {
  /** 表的代號。沒有表對應的 CSV 為 null */
  key: string | null
  label: string | null
  /** 登記於 mock CSV */
  registered: boolean
  /** 登記的 CSV。未登記時為 mock/<代號>-test.csv（存在時） */
  csv: string | null
  /** CSV 的資料列數 */
  rows: number | null
}

export interface MockOverviewSource {
  paths: readonly string[]
  tables: Readonly<Record<string, TableSummary>>
  tableOrder: readonly string[]
  csvRows: Readonly<Record<string, number>>
}

/** 測試資料的總覽：各表依 schemas 中的順序，其他的表與登記的代號依代號排序，沒有表對應的 CSV 在最後 */
export function mockOverviewRows (model: MockTablesModel, { paths, tables, tableOrder, csvRows }: MockOverviewSource): MockOverviewRow[] {
  const others = new Set([...Object.keys(tables), ...Object.keys(model.csv)].filter(key => !tableOrder.includes(key)))
  // 虛擬表沒有 mock CSV，不列出
  const keys = [...tableOrder, ...[...others].toSorted()].filter(key => !tables[key]?.virtual)
  const tableRows = keys.map(key => {
    const registered = model.csv[key]
    const csv = registered ?? (paths.includes(mockCsvFileOf(key)) ? mockCsvFileOf(key) : null)
    return { key, label: tables[key]?.label ?? null, registered: registered !== undefined, csv, rows: csv === null ? null : csvRows[csv] ?? null }
  })
  const used = new Set(tableRows.map(row => row.csv))
  const orphans = paths.filter(path => isMockCsvFile(path) && !used.has(path)).toSorted().map(csv => ({ key: null, label: null, registered: false, csv, rows: csvRows[csv] ?? null }))
  return [...tableRows, ...orphans]
}
