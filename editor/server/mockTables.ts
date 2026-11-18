// services/mock/tables.ts 中各表登記的 mock CSV
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import path from 'node:path'
import { literalText } from '../shared/schema.ts'
import { MOCK_TABLES_FILE } from '../shared/tableFiles.ts'
import { applyEdits, insertItem, removeItem } from './schema/listEdits.ts'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { listSpanOf } from './schema/schemaModel.ts'

// 預設匯入的名稱對應檔案於專案中的路徑，去掉 ? 之後的部分
function defaultImports (ts: TypeScript, source: TS.SourceFile): Map<string, string> {
  const imports = new Map<string, string>()
  for (const statement of source.statements) {
    const name = ts.isImportDeclaration(statement) ? statement.importClause?.name?.text : undefined
    if (name && ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text.replace(/\?.*$/, '')
      imports.set(name, path.posix.join(path.posix.dirname(MOCK_TABLES_FILE), specifier))
    }
  }
  return imports
}

// mockCsv 物件的字面值
function mockCsvObject (ts: TypeScript, source: TS.SourceFile): TS.ObjectLiteralExpression | null {
  for (const statement of source.statements) {
    const declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : []
    const found = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'mockCsv')
    if (found?.initializer && ts.isObjectLiteralExpression(found.initializer)) {
      return found.initializer
    }
  }
  return null
}

// 屬性的名稱與值的變數名。其他寫法為 null
function entryOf (ts: TypeScript, property: TS.ObjectLiteralElementLike): [string, string] | null {
  if (ts.isShorthandPropertyAssignment(property)) {
    return [property.name.text, property.name.text]
  }
  if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && ts.isIdentifier(property.initializer)) {
    return [property.name.text, property.initializer.text]
  }
  return null
}

/** 表的代號對應 CSV 於專案中的路徑。mockCsv 物件中以匯入的名稱寫成的項目才列入 */
export function readMockCsvPaths (ts: TypeScript, text: string): Record<string, string> {
  const source = ts.createSourceFile('tables.ts', text, ts.ScriptTarget.Latest, true)
  const imports = defaultImports(ts, source)
  const result: Record<string, string> = {}
  for (const property of mockCsvObject(ts, source)?.properties ?? []) {
    const entry = entryOf(ts, property)
    const csv = entry ? imports.get(entry[1]) : undefined
    if (entry && csv) {
      result[entry[0]] = csv
    }
  }
  return result
}

// mockCsv 物件與其中的各項
function loadMockCsv (ts: TypeScript, text: string): { source: TS.SourceFile, object: TS.ObjectLiteralExpression } {
  const source = ts.createSourceFile('tables.ts', text, ts.ScriptTarget.Latest, true)
  const object = mockCsvObject(ts, source)
  if (!object) {
    throw new SchemaEditError(`${MOCK_TABLES_FILE} 中找不到 mockCsv 物件，請以文字編輯。`)
  }
  return { source, object }
}

/** 登記表的 mock CSV：加上 CSV 的預設匯入，並於 mockCsv 的最後加上一項 */
export function addMockCsv (ts: TypeScript, text: string, key: string, csvPath: string): string {
  const { source, object } = loadMockCsv(ts, text)
  if (object.properties.some(property => entryOf(ts, property)?.[0] === key)) {
    return text
  }
  const name = `${key}Csv`
  const added = applyEdits(text, insertItem(text, listSpanOf(ts, source, object), object.properties.length, `${key}: ${name}`, 'multiline'))
  const specifier = `${path.posix.relative(path.posix.dirname(MOCK_TABLES_FILE), csvPath)}?raw`
  const lastImport = source.statements.findLast(statement => ts.isImportDeclaration(statement))
  const line = `import ${name} from ${literalText(specifier)}\n`
  const at = lastImport ? lastImport.end + 1 : 0
  // 匯入加於最後一個匯入之後，位置在 mockCsv 物件之前，不受上面的修改影響
  return added.slice(0, at) + line + added.slice(at)
}

/** 刪除表的 mock CSV 的登記，以及不再使用的匯入 */
export function removeMockCsv (ts: TypeScript, text: string, key: string): string {
  const { source, object } = loadMockCsv(ts, text)
  const index = object.properties.findIndex(property => entryOf(ts, property)?.[0] === key)
  if (index === -1) {
    return text
  }
  const name = entryOf(ts, object.properties[index]!)![1]
  const removed = applyEdits(text, removeItem(text, listSpanOf(ts, source, object), index))
  const after = ts.createSourceFile('tables.ts', removed, ts.ScriptTarget.Latest, true)
  const declaration = after.statements.find(statement => ts.isImportDeclaration(statement) && statement.importClause?.name?.text === name && !statement.importClause.namedBindings)
  if (!declaration) {
    return removed
  }
  const end = removed[declaration.end] === '\n' ? declaration.end + 1 : declaration.end
  return removed.slice(0, declaration.getStart(after)) + removed.slice(end)
}
