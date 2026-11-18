// services/mock/tables.ts 中各表登記的 mock CSV
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import path from 'node:path'

export const MOCK_TABLES_FILE = 'vue-build/src/services/mock/tables.ts'

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
