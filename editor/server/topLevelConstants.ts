// 檔案頂層的 const：讀取初始值，以及取代初始值。Config.gs 與 config/app.ts 共用
import type { ConfigValue } from '../shared/configGs.ts'
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { parseSource, unwrap } from './schema/schemaModel.ts'

/** 頂層 const 的宣告。找不到時為 null */
export function declarationOf (ts: TypeScript, source: TS.SourceFile, name: string): TS.VariableDeclaration | null {
  for (const statement of source.statements) {
    const declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : []
    const found = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name)
    if (found) {
      return found
    }
  }
  return null
}

/** 頂層 const 的初始值。找不到時為 null */
export function constantOf (ts: TypeScript, source: TS.SourceFile, name: string): TS.Expression | null {
  return declarationOf(ts, source, name)?.initializer ?? null
}

export function code (node: TS.Node, source: TS.SourceFile): { kind: 'code', text: string } {
  return { kind: 'code', text: node.getText(source) }
}

export function stringOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | null | undefined): ConfigValue<string> {
  if (!node) {
    return null
  }
  const inner = unwrap(ts, node)
  return ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner) ? { kind: 'value', value: inner.text } : code(node, source)
}

export function numberOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | null): ConfigValue<number> {
  if (!node) {
    return null
  }
  const inner = unwrap(ts, node)
  return ts.isNumericLiteral(inner) ? { kind: 'value', value: Number(inner.text) } : code(node, source)
}

export function replaceRange (text: string, node: TS.Node, source: TS.SourceFile, replacement: string): string {
  return text.slice(0, node.getStart(source)) + replacement + text.slice(node.end)
}

/** 以 replacement 取代頂層 const 的初始值。file 為錯誤訊息中的檔名 */
export function replaceConstant (ts: TypeScript, text: string, name: string, replacement: string, file: string): string {
  const source = parseSource(ts, text)
  const node = constantOf(ts, source, name)
  if (!node) {
    throw new SchemaEditError(`${file} 中找不到 ${name}，請以其他編輯器修改。`)
  }
  return replaceRange(text, node, source, replacement)
}
