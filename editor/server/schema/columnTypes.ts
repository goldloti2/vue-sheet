// 讀取 vue-build/src/schema/types.ts：ColumnTypes 中各欄位型別的值與型別專屬的設定，以及 FormatRule 的各項設定
// 設定的輸入方式依其型別決定。同一檔案中的型別別名先展開
import type { ColumnTypeInfo, OptionControl, SchemaTypes, SettingOption } from '../../shared/schema.ts'
import type { TypeScript } from '../vueBuild.ts'
import type TS from 'typescript'

// 型別為欄位的 key
const COLUMN_KEY_TYPES = new Set(['RowKey', 'ColumnKey'])

function docOf (ts: TypeScript, node: TS.Node): string | null {
  const docs = ts.getJSDocCommentsAndTags(node).filter(doc => ts.isJSDoc(doc))
  const text = docs.map(doc => ts.getTextOfJSDocComment(doc.comment) ?? '').join('\n').trim()
  return text || null
}

function parseTypes (ts: TypeScript, typesText: string): TS.SourceFile {
  return ts.createSourceFile('types.ts', typesText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

// 同一檔案中的型別別名，例如 ColorName
function resolveAlias (ts: TypeScript, source: TS.SourceFile, type: TS.TypeNode): TS.TypeNode {
  if (!ts.isTypeReferenceNode(type) || type.typeArguments) {
    return type
  }
  const name = type.typeName.getText(source)
  const alias = source.statements.find((statement): statement is TS.TypeAliasDeclaration =>
    ts.isTypeAliasDeclaration(statement) && statement.name.text === name)
  return alias ? alias.type : type
}

function isColumnKey (ts: TypeScript, source: TS.SourceFile, type: TS.TypeNode): boolean {
  return ts.isTypeReferenceNode(type) && COLUMN_KEY_TYPES.has(type.typeName.getText(source))
}

function controlOf (ts: TypeScript, source: TS.SourceFile, node: TS.TypeNode | undefined): OptionControl {
  if (!node) {
    return { kind: 'code' }
  }
  const type = resolveAlias(ts, source, node)
  if (type.kind === ts.SyntaxKind.BooleanKeyword) {
    return { kind: 'boolean' }
  }
  if (type.kind === ts.SyntaxKind.NumberKeyword) {
    return { kind: 'number' }
  }
  if (type.kind === ts.SyntaxKind.StringKeyword) {
    return { kind: 'string' }
  }
  if (isColumnKey(ts, source, type)) {
    return { kind: 'column' }
  }
  if (ts.isArrayTypeNode(type)) {
    if (type.elementType.kind === ts.SyntaxKind.StringKeyword) {
      return { kind: 'strings' }
    }
    return isColumnKey(ts, source, type.elementType) ? { kind: 'columns' } : { kind: 'code' }
  }
  const literals = ts.isUnionTypeNode(type) ? type.types : [type]
  const values = literals.flatMap(literal => ts.isLiteralTypeNode(literal) && ts.isStringLiteral(literal.literal) ? [literal.literal.text] : [])
  return values.length === literals.length ? { kind: 'choice', values } : { kind: 'code' }
}

function memberType (ts: TypeScript, members: readonly TS.TypeElement[], name: string): TS.PropertySignature | undefined {
  return members.find((member): member is TS.PropertySignature =>
    ts.isPropertySignature(member) && ts.isIdentifier(member.name) && member.name.text === name)
}

function optionsOf (ts: TypeScript, source: TS.SourceFile, members: readonly TS.TypeElement[]): SettingOption[] {
  return members.flatMap(option => ts.isPropertySignature(option) && ts.isIdentifier(option.name)
    ? [{
        name: option.name.text,
        typeText: option.type?.getText(source) ?? 'unknown',
        optional: option.questionToken !== undefined,
        doc: docOf(ts, option),
        control: controlOf(ts, source, option.type),
      }]
    : [])
}

function findInterface (ts: TypeScript, source: TS.SourceFile, name: string): TS.InterfaceDeclaration | undefined {
  return source.statements.find((statement): statement is TS.InterfaceDeclaration =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === name)
}

// 找不到 ColumnTypes 時回傳空陣列
export function readColumnTypes (ts: TypeScript, typesText: string): ColumnTypeInfo[] {
  const source = parseTypes(ts, typesText)
  const declaration = findInterface(ts, source, 'ColumnTypes')
  if (!declaration) {
    return []
  }
  return declaration.members.flatMap(member => {
    if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name) || !member.type || !ts.isTypeLiteralNode(member.type)) {
      return []
    }
    const value = memberType(ts, member.type.members, 'value')
    const extra = memberType(ts, member.type.members, 'extra')?.type
    return [{
      name: member.name.text,
      valueType: value?.type?.getText(source) ?? 'unknown',
      doc: docOf(ts, member),
      options: extra && ts.isTypeLiteralNode(extra) ? optionsOf(ts, source, extra.members) : [],
    }]
  })
}

// 介面的各項設定。找不到介面時回傳空陣列
export function readInterfaceOptions (ts: TypeScript, typesText: string, name: string): SettingOption[] {
  const source = parseTypes(ts, typesText)
  const declaration = findInterface(ts, source, name)
  return declaration ? optionsOf(ts, source, declaration.members) : []
}

// 型別別名或介面中各屬性的說明，含交集與映射型別中的屬性。同名的屬性取第一個
export function readPropertyDocs (ts: TypeScript, typesText: string, names: readonly string[]): Record<string, string> {
  const source = parseTypes(ts, typesText)
  const docs: Record<string, string> = {}
  const visit = (node: TS.Node): void => {
    if (ts.isPropertySignature(node) && ts.isIdentifier(node.name)) {
      const doc = docOf(ts, node)
      if (doc && !(node.name.text in docs)) {
        docs[node.name.text] = doc
      }
    }
    ts.forEachChild(node, visit)
  }
  for (const name of names) {
    const declaration = source.statements.find(statement =>
      (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) && statement.name.text === name)
    if (declaration) {
      visit(declaration)
    }
  }
  return docs
}

export function readSchemaTypes (ts: TypeScript, typesText: string, colors: SchemaTypes['colors']): SchemaTypes {
  return {
    columnTypes: readColumnTypes(ts, typesText),
    formatRule: readInterfaceOptions(ts, typesText, 'FormatRule'),
    columnDocs: readPropertyDocs(ts, typesText, ['ColumnBase', 'SchemaColumn', 'VirtualColumn']),
    schemaDocs: readPropertyDocs(ts, typesText, ['TableSchema']),
    colors,
  }
}
