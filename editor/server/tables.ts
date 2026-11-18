// 新增與刪除表。檔案的建立與刪除，以及 schemas 與 mock CSV 的登記，皆立即寫入
import type { DeleteTableResult, NewTableRequest, NewTableResult } from '../shared/tableFiles.ts'
import type { Formatter } from './files.ts'
import type { TypeScript } from './vueBuild.ts'
import { readdir, readFile, rm, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { literalText, propertyValue, stringValue } from '../shared/schema.ts'
import { columnRows } from '../shared/schemaForm.ts'
import { idPrefixError, MOCK_TABLES_FILE, mockCsvFileOf, PAGES_DIR, schemaFileOf, tableDeletionFiles, tableKeyError } from '../shared/tableFiles.ts'
import { actionsFileOf, REGISTRY_FILE, tableKeyOf } from '../shared/tableKeys.ts'
import { readProjectFile, writeProjectFile } from './files.ts'
import { addMockCsv, readMockCsvPaths, removeMockCsv } from './mockTables.ts'
import { absolutePath, listProjectFiles } from './projectFiles.ts'
import { applyRegistryEdits, parseRegistry } from './schema/registry.ts'
import { removeColumn } from './schema/schemaColumns.ts'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { parseSchema } from './schema/schemaModel.ts'

// 框架的範本，只讀取
const TEMPLATE_DIR = 'vue-build/template/table'

export interface TableTools {
  ts: TypeScript
  /** repo 的根目錄 */
  root: string
  format: Formatter
}

function pascalCase (key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

// 複製範本：取代佔位字串，刪除開頭「複製到」那一段註解（至第一個只有 // 的行）
function fromTemplate (text: string, key: string): string {
  const lines = text.split('\n')
  const blank = lines.findIndex(line => line.trim() === '//')
  const body = lines[0]?.startsWith('// 複製到') ? lines.slice(blank === -1 ? 1 : blank + 1) : lines
  return body.join('\n').replaceAll('__table__', key).replaceAll('__Table__', pascalCase(key))
}

// 範本的 schema 改為新表：表名、主鍵字首（範本為 TPL），並只留主鍵與稱呼的欄位
function newSchemaText (ts: TypeScript, template: string, request: NewTableRequest): string {
  let text = fromTemplate(template, request.key)
    .replace(/tableLabel: '[^']*'/, `tableLabel: ${literalText(request.label)}`)
    .replaceAll(/\bTPL\b/g, request.prefix)
  const { schema } = parseSchema(ts, text)
  const kept = new Set([stringValue(propertyValue(schema, 'idColumn')), stringValue(propertyValue(schema, 'labelColumn'))])
  for (const row of columnRows(parseSchema(ts, text))) {
    if (row.key !== null && !kept.has(row.key)) {
      text = removeColumn(ts, text, row.key)
    }
  }
  return text
}

// mock CSV 只有表頭一列：真實欄位的 Sheet 表頭
function csvHeaderText (ts: TypeScript, schemaText: string): string {
  const headers = columnRows(parseSchema(ts, schemaText)).flatMap(row => {
    if (row.list !== 'columns') {
      return []
    }
    const header = stringValue(propertyValue(row.object, 'sheetHeader')) ?? stringValue(propertyValue(row.object, 'label'))
    return header === null ? [] : [header]
  })
  return `${headers.join(',')}\n`
}

async function readRequired (root: string, filePath: string) {
  const file = await readProjectFile(root, filePath)
  if (!file) {
    throw new SchemaEditError(`找不到 ${filePath}。`)
  }
  return file
}

async function writeOrFail (tools: TableTools, filePath: string, text: string, baseHash: string | null): Promise<void> {
  const result = await writeProjectFile(tools.root, filePath, text, baseHash, tools.format)
  if (!result.ok) {
    throw new SchemaEditError(`${filePath} 已在別處修改，沒有寫入。`)
  }
}

/** 由範本建立 schema、動作與 mock CSV，並登記於 schemas 與 mock CSV */
export async function createTable (tools: TableTools, request: NewTableRequest): Promise<NewTableResult> {
  const { ts, root } = tools
  const paths = await listProjectFiles(root)
  const [registry, mockTables] = await Promise.all([readRequired(root, REGISTRY_FILE), readRequired(root, MOCK_TABLES_FILE)])
  const registered = parseRegistry(ts, registry.text)?.entries.map(entry => entry.key ?? '') ?? []
  const existing = [...registered, ...paths.map(file => tableKeyOf(file)).filter(key => key !== null)]
  const error = tableKeyError(request.key, existing) ?? idPrefixError(request.prefix) ?? (request.label.trim() === '' ? '請輸入表名。' : null)
  if (error) {
    throw new SchemaEditError(error)
  }

  const schemaFile = schemaFileOf(request.key)
  const actionsFile = actionsFileOf(request.key)
  const csvFile = mockCsvFileOf(request.key)
  const taken = [schemaFile, actionsFile, csvFile].filter(file => paths.includes(file))
  if (taken.length > 0) {
    throw new SchemaEditError(`已有檔案：${taken.join('、')}`)
  }

  const [schemaTemplate, actionsTemplate] = await Promise.all([
    readFile(path.join(root, TEMPLATE_DIR, 'schema.ts'), 'utf8'),
    readFile(path.join(root, TEMPLATE_DIR, 'use__Table__Actions.ts'), 'utf8'),
  ])
  const schemaText = newSchemaText(ts, schemaTemplate, { ...request, label: request.label.trim() })
  const variable = parseSchema(ts, schemaText).variable ?? `${request.key}Schema`
  // 先算出全部的內容，任一項失敗時不寫入任何檔案
  const registryText = applyRegistryEdits(ts, registry.text, [{ kind: 'add', key: request.key, variable }])
  const mockTablesText = addMockCsv(ts, mockTables.text, request.key, csvFile)

  await writeOrFail(tools, schemaFile, schemaText, null)
  await writeOrFail(tools, actionsFile, fromTemplate(actionsTemplate, request.key), null)
  await writeOrFail(tools, csvFile, csvHeaderText(ts, schemaText), null)
  await writeOrFail(tools, REGISTRY_FILE, registryText, registry.hash)
  await writeOrFail(tools, MOCK_TABLES_FILE, mockTablesText, mockTables.hash)
  return { created: [schemaFile, actionsFile, csvFile] }
}

// 刪除檔案後，由內而外刪除 pages/ 中變空的資料夾
async function removeEmptyFolders (root: string, files: readonly string[]): Promise<void> {
  const folders = new Set<string>()
  for (const file of files.filter(candidate => candidate.startsWith(PAGES_DIR))) {
    for (let folder = path.posix.dirname(file); folder.length > PAGES_DIR.length - 1; folder = path.posix.dirname(folder)) {
      folders.add(folder)
    }
  }
  for (const folder of [...folders].toSorted((a, b) => b.length - a.length)) {
    const absolute = path.join(root, ...folder.split('/'))
    const entries = await readdir(absolute).catch(() => null)
    if (entries?.length === 0) {
      await rmdir(absolute)
    }
  }
}

/** 刪除表的檔案（見 tableDeletionFiles），以及 schemas 與 mock CSV 的登記 */
export async function deleteTable (tools: TableTools, key: string): Promise<DeleteTableResult> {
  const { ts, root } = tools
  const paths = await listProjectFiles(root)
  const [registry, mockTables] = await Promise.all([readRequired(root, REGISTRY_FILE), readRequired(root, MOCK_TABLES_FILE)])
  const files = tableDeletionFiles(key, paths, readMockCsvPaths(ts, mockTables.text))
  const registered = parseRegistry(ts, registry.text)?.entries.some(entry => entry.key === key) ?? false
  // 先算出登記修改後的內容，失敗時不刪除任何檔案
  const registryText = registered ? applyRegistryEdits(ts, registry.text, [{ kind: 'remove', key }]) : null
  const mockTablesText = removeMockCsv(ts, mockTables.text, key)

  if (registryText !== null) {
    await writeOrFail(tools, REGISTRY_FILE, registryText, registry.hash)
  }
  if (mockTablesText !== mockTables.text) {
    await writeOrFail(tools, MOCK_TABLES_FILE, mockTablesText, mockTables.hash)
  }
  for (const file of files) {
    await rm(absolutePath(root, file), { force: true })
  }
  await removeEmptyFolders(root, files)
  return { deleted: files }
}
