// 總覽的各列：schemas 中登記的表依其順序在前，有 schema 檔但未登記的表在後
import type { TableSummary } from './api.ts'
import type { RegistryModel } from './registry.ts'
import { actionsFileOf, tableKeyOf, TABLES_DIR } from './tableKeys.ts'

/** 表的各個檔案。沒有時為 null */
export interface TableFiles {
  schema: string | null
  actions: string | null
  /** 列表頁。沒有列表頁時為詳細頁，再沒有時為資料夾中的第一個頁面 */
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
