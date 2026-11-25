// 新增與刪除表。檔案的建立與刪除，以及 schemas、tableActions 與 mock CSV 的登記，皆立即寫入
import type { DeleteTableResult, NewTableRequest, NewTableResult } from '../shared/tableFiles.ts'
import type { Formatter } from './files.ts'
import type { TypeScript } from './vueBuild.ts'
import { readdir, readFile, rm, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { CONFIG_FILE, idHeaderOf } from '../shared/configGs.ts'
import { csvRowText } from '../shared/csv.ts'
import { NAVIGATION_FILE, pageRoutes } from '../shared/navigationForm.ts'
import { registryAddBefore } from '../shared/registry.ts'
import { literalText, propertyValue, stringValue } from '../shared/schema.ts'
import { columnRows } from '../shared/schemaForm.ts'
import { idPrefixError, MOCK_TABLES_FILE, mockCsvFileOf, PAGES_DIR, schemaFileOf, tableDeletionFiles, tableKeyError } from '../shared/tableFiles.ts'
import { ACTIONS_REGISTRY_FILE, actionsFileOf, actionsNameOf, REGISTRY_FILE, tableKeyOf } from '../shared/tableKeys.ts'
import { applyConfigEdits, readConfigTables } from './configGs.ts'
import { readProjectFile, writeProjectFile } from './files.ts'
import { addMockCsv, readMockCsvPaths, removeMockCsv } from './mockTables.ts'
import { removeNavLinks } from './navigationForm.ts'
import { absolutePath, listProjectFiles } from './projectFiles.ts'
import { ACTIONS_REGISTRY, applyRegistryEdits, parseRegistry } from './schema/registry.ts'
import { removeColumn, removeRowMember } from './schema/schemaColumns.ts'
import { SchemaEditError, setProperty } from './schema/schemaEdits.ts'
import { parseSchema } from './schema/schemaModel.ts'
import { readTableSummaries, readTableSummary } from './tableSummaries.ts'

// 框架的範本，只讀取。虛擬表的範本位於其中的 virtual/
const TEMPLATE_DIR = 'vue-build/template/table'
const VIRTUAL_TEMPLATE_DIR = `${TEMPLATE_DIR}/virtual`

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
// 虛擬表另外清空規則，並刪除來源表（範本為 __source__）的匯入與 getter
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
  if (request.virtual) {
    text = setProperty(ts, text, [], 'rules', '[]')
    text = removeRowMember(ts, text, '$source')
    text = text.replace(/^import type \{ __Source__Row \} from '\.\/__source__'\n/m, '')
  }
  return text
}

// mock CSV 只有表頭一列：真實欄位的 Sheet 表頭
function csvHeaderText (ts: TypeScript, schemaText: string): string {
  return csvRowText(readTableSummary(ts, schemaText).columns.flatMap(column => column.header === null ? [] : [column.header]))
}

async function readRequired (root: string, filePath: string) {
  const file = await readProjectFile(root, filePath)
  if (!file) {
    throw new SchemaEditError(`找不到 ${filePath}。`)
  }
  return file
}

// Config.gs 與其中的 TABLES。沒有此檔或 TABLES 不是物件字面值時為 null
async function readConfig (ts: TypeScript, root: string) {
  const config = await readProjectFile(root, CONFIG_FILE)
  return config && readConfigTables(ts, config.text) !== null ? config : null
}

async function writeOrFail (tools: TableTools, filePath: string, text: string, baseHash: string | null): Promise<void> {
  const result = await writeProjectFile(tools.root, filePath, text, baseHash, tools.format)
  if (!result.ok) {
    throw new SchemaEditError(`${filePath} 已在別處修改，沒有寫入。`)
  }
}

/** 由範本建立 schema、動作與 mock CSV，並登記於 schemas、tableActions 與 mock CSV。真實表另登記於 Config.gs */
export async function createTable (tools: TableTools, request: NewTableRequest): Promise<NewTableResult> {
  const { ts, root } = tools
  const paths = await listProjectFiles(root)
  const [registry, actionsRegistry, mockTables] = await Promise.all([readRequired(root, REGISTRY_FILE), readRequired(root, ACTIONS_REGISTRY_FILE), readRequired(root, MOCK_TABLES_FILE)])
  const registered = parseRegistry(ts, registry.text)?.entries.map(entry => entry.key ?? '') ?? []
  const existing = [...registered, ...paths.map(file => tableKeyOf(file)).filter(key => key !== null)]
  const error = tableKeyError(request.key, existing, paths) ?? (request.virtual ? null : idPrefixError(request.prefix)) ?? (request.label.trim() === '' ? '請輸入表名。' : null)
  if (error) {
    throw new SchemaEditError(error)
  }

  const schemaFile = schemaFileOf(request.key)
  const actionsFile = actionsFileOf(request.key)
  const csvFile = request.virtual ? null : mockCsvFileOf(request.key)
  const created = [schemaFile, actionsFile, ...csvFile === null ? [] : [csvFile]]
  const taken = created.filter(file => paths.includes(file))
  if (taken.length > 0) {
    throw new SchemaEditError(`已有檔案：${taken.join('、')}`)
  }

  const templateDir = request.virtual ? VIRTUAL_TEMPLATE_DIR : TEMPLATE_DIR
  const [schemaTemplate, actionsTemplate] = await Promise.all([
    readFile(path.join(root, templateDir, 'schema.ts'), 'utf8'),
    readFile(path.join(root, templateDir, 'use__Table__Actions.ts'), 'utf8'),
  ])
  const schemaText = newSchemaText(ts, schemaTemplate, { ...request, label: request.label.trim() })
  const variable = parseSchema(ts, schemaText).variable ?? `${request.key}Schema`
  // 先算出全部的內容，任一項失敗時不寫入任何檔案
  const registryModel = parseRegistry(ts, registry.text)
  const summaries = await readTableSummaries(ts, root, paths)
  const before = registryModel ? registryAddBefore(registryModel, key => summaries[key]?.virtual ?? false, request.virtual) : undefined
  const registryText = applyRegistryEdits(ts, registry.text, [{ kind: 'add', key: request.key, variable, before }])
  const actionsRegistryText = applyRegistryEdits(ts, actionsRegistry.text, [{ kind: 'add', key: request.key, variable: actionsNameOf(request.key) }], ACTIONS_REGISTRY)
  const mockTablesText = csvFile === null ? null : addMockCsv(ts, mockTables.text, request.key, csvFile)
  const config = request.virtual ? null : await readConfig(ts, root)
  const idHeader = idHeaderOf(readTableSummary(ts, schemaText))
  const configText = config === null || idHeader === null
    ? null
    : applyConfigEdits(ts, config.text, [{ kind: 'addTable', key: request.key, sheetName: request.sheetName.trim() || request.label.trim(), idColumn: idHeader }])

  await writeOrFail(tools, schemaFile, schemaText, null)
  await writeOrFail(tools, actionsFile, fromTemplate(actionsTemplate, request.key), null)
  if (csvFile !== null && mockTablesText !== null) {
    await writeOrFail(tools, csvFile, csvHeaderText(ts, schemaText), null)
  }
  await writeOrFail(tools, REGISTRY_FILE, registryText, registry.hash)
  await writeOrFail(tools, ACTIONS_REGISTRY_FILE, actionsRegistryText, actionsRegistry.hash)
  if (mockTablesText !== null) {
    await writeOrFail(tools, MOCK_TABLES_FILE, mockTablesText, mockTables.hash)
  }
  if (config !== null && configText !== null && configText !== config.text) {
    await writeOrFail(tools, CONFIG_FILE, configText, config.hash)
  }
  return { created, config: configText !== null }
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

/** 刪除表的檔案（見 tableDeletionFiles），以及 schemas、tableActions、mock CSV 與 Config.gs 的登記 */
export async function deleteTable (tools: TableTools, key: string): Promise<DeleteTableResult> {
  const { ts, root } = tools
  const paths = await listProjectFiles(root)
  const [registry, actionsRegistry, mockTables] = await Promise.all([readRequired(root, REGISTRY_FILE), readRequired(root, ACTIONS_REGISTRY_FILE), readRequired(root, MOCK_TABLES_FILE)])
  const files = tableDeletionFiles(key, paths, readMockCsvPaths(ts, mockTables.text))
  const registered = parseRegistry(ts, registry.text)?.entries.some(entry => entry.key === key) ?? false
  // 先算出登記修改後的內容，失敗時不刪除任何檔案
  const registryText = registered ? applyRegistryEdits(ts, registry.text, [{ kind: 'remove', key }]) : null
  const actionsRegistered = parseRegistry(ts, actionsRegistry.text, ACTIONS_REGISTRY)?.entries.some(entry => entry.key === key) ?? false
  const actionsRegistryText = actionsRegistered ? applyRegistryEdits(ts, actionsRegistry.text, [{ kind: 'remove', key }], ACTIONS_REGISTRY) : null
  const mockTablesText = removeMockCsv(ts, mockTables.text, key)
  const config = await readConfig(ts, root)
  const configText = config === null ? null : applyConfigEdits(ts, config.text, [{ kind: 'removeTable', key }])
  const configChanged = config !== null && configText !== null && configText !== config.text
  const navigation = await readProjectFile(root, NAVIGATION_FILE)
  const navigationText = navigation === null ? null : removeNavLinks(ts, navigation.text, pageRoutes(files))

  if (registryText !== null) {
    await writeOrFail(tools, REGISTRY_FILE, registryText, registry.hash)
  }
  if (actionsRegistryText !== null) {
    await writeOrFail(tools, ACTIONS_REGISTRY_FILE, actionsRegistryText, actionsRegistry.hash)
  }
  if (mockTablesText !== mockTables.text) {
    await writeOrFail(tools, MOCK_TABLES_FILE, mockTablesText, mockTables.hash)
  }
  if (configChanged) {
    await writeOrFail(tools, CONFIG_FILE, configText, config.hash)
  }
  if (navigation !== null && navigationText !== null && navigationText !== navigation.text) {
    await writeOrFail(tools, NAVIGATION_FILE, navigationText, navigation.hash)
  }
  for (const file of files) {
    await rm(absolutePath(root, file), { force: true })
  }
  await removeEmptyFolders(root, files)
  return { deleted: files, config: configChanged }
}

/** 為表建立只有表頭的 mock CSV，並登記於 mock CSV */
export async function createMockCsv (tools: TableTools, key: string): Promise<NewTableResult> {
  const { ts, root } = tools
  const [schema, mockTables] = await Promise.all([readRequired(root, schemaFileOf(key)), readRequired(root, MOCK_TABLES_FILE)])
  const csvFile = mockCsvFileOf(key)
  if (await readProjectFile(root, csvFile)) {
    throw new SchemaEditError(`已有檔案：${csvFile}`)
  }
  const mockTablesText = addMockCsv(ts, mockTables.text, key, csvFile)
  await writeOrFail(tools, csvFile, csvHeaderText(ts, schema.text), null)
  await writeOrFail(tools, MOCK_TABLES_FILE, mockTablesText, mockTables.hash)
  return { created: [csvFile], config: false }
}
