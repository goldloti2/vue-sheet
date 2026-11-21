// vue-build/src/config/app.ts：各設定項的值，以及型別列出的選項
import type { AppChoiceName, AppConfigEdit, AppConfigModel } from '../shared/appConfig.ts'
import type { ConfigValue } from '../shared/configGs.ts'
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import { literalText } from '../shared/schema.ts'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { parseSource, unwrap } from './schema/schemaModel.ts'
import { constantOf, declarationOf, numberOf, replaceConstant, stringOf } from './topLevelConstants.ts'

const FILE_NAME = 'app.ts'

function nullableNumberOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | null): ConfigValue<number | null> {
  if (node && unwrap(ts, node).kind === ts.SyntaxKind.NullKeyword) {
    return { kind: 'value', value: null }
  }
  return numberOf(ts, source, node)
}

// 型別為同一檔案中的 type alias 時，改用 alias 的型別
function resolveType (ts: TypeScript, source: TS.SourceFile, type: TS.TypeNode): TS.TypeNode {
  if (!ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) {
    return type
  }
  const name = type.typeName.text
  const alias = source.statements.find(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === name)
  return alias && ts.isTypeAliasDeclaration(alias) ? alias.type : type
}

// 字串字面值的 union 中的值。有其他成員時為 null
function optionsOf (ts: TypeScript, source: TS.SourceFile, name: string): string[] | null {
  const type = declarationOf(ts, source, name)?.type
  if (!type) {
    return null
  }
  const resolved = resolveType(ts, source, type)
  const members = ts.isUnionTypeNode(resolved) ? [...resolved.types] : [resolved]
  const values = members.map(member => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal) ? member.literal.text : null)
  return values.every(value => value !== null) ? values : null
}

/** app.ts 的各設定項 */
export function parseAppConfig (ts: TypeScript, text: string): AppConfigModel {
  const source = parseSource(ts, text)
  const options = (name: AppChoiceName) => optionsOf(ts, source, name)
  return {
    appName: stringOf(ts, source, constantOf(ts, source, 'appName')),
    authMethod: stringOf(ts, source, constantOf(ts, source, 'authMethod')),
    detailFieldLayout: stringOf(ts, source, constantOf(ts, source, 'detailFieldLayout')),
    autoPushDelay: nullableNumberOf(ts, source, constantOf(ts, source, 'autoPushDelay')),
    options: { authMethod: options('authMethod'), detailFieldLayout: options('detailFieldLayout') },
  }
}

function valueText (edit: AppConfigEdit): string {
  if (edit.name === 'autoPushDelay') {
    return edit.value === null ? 'null' : String(edit.value)
  }
  return literalText(edit.value)
}

/** 依序取代設定項的值。型別、註解與其他程式碼不變。設定項以程式碼寫成或找不到時拋出錯誤 */
export function applyAppConfigEdits (ts: TypeScript, text: string, edits: readonly AppConfigEdit[]): string {
  let next = text
  for (const edit of edits) {
    if (parseAppConfig(ts, next)[edit.name]?.kind === 'code') {
      throw new SchemaEditError(`${FILE_NAME} 的 ${edit.name} 以程式碼寫成，請以其他編輯器修改。`)
    }
    next = replaceConstant(ts, next, edit.name, valueText(edit), FILE_NAME)
  }
  return next
}
