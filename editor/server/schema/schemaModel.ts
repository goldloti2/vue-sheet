// 解析 schema 檔：Row 介面與 TableSchema<Row> 物件。以字面值寫成的設定轉為值，其他寫法保留原文
// 位置皆為文字中的 UTF-16 位移，供文字編輯使用
import type { RowInterface, SchemaModel, SchemaPath, SchemaProperty, SchemaValue, TextRange } from '../../shared/schema.ts'
import type { TypeScript } from '../vueBuild.ts'
import type { ListSpan } from './listEdits.ts'
import type TS from 'typescript'

/** 找到的語法節點，供文字編輯使用 */
export interface SchemaNodes {
  source: TS.SourceFile
  declaration: TS.VariableDeclaration | null
  object: TS.ObjectLiteralExpression | null
  row: TS.InterfaceDeclaration | null
}

export function parseSource (ts: TypeScript, text: string): TS.SourceFile {
  return ts.createSourceFile('schema.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

// as const、satisfies 與括號不影響值
export function unwrap (ts: TypeScript, node: TS.Expression): TS.Expression {
  let current = node
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression
  }
  return current
}

export function propertyName (ts: TypeScript, property: TS.ObjectLiteralElementLike | TS.TypeElement): string | null {
  const name = property.name
  if (!name) {
    return null
  }
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : null
}

export function findProperty (ts: TypeScript, object: TS.ObjectLiteralExpression, name: string): TS.PropertyAssignment | undefined {
  return object.properties.find((property): property is TS.PropertyAssignment =>
    ts.isPropertyAssignment(property) && propertyName(ts, property) === name)
}

// 型別為 TableSchema<Row> 的變數。沒有此變數時，改找第一個含 tableLabel 屬性的物件字面值
export function findSchemaNodes (ts: TypeScript, source: TS.SourceFile): SchemaNodes {
  let declaration: TS.VariableDeclaration | null = null
  let object: TS.ObjectLiteralExpression | null = null
  let fallback: TS.ObjectLiteralExpression | null = null

  const visit = (node: TS.Node): void => {
    if (declaration) {
      return
    }
    if (ts.isVariableDeclaration(node) && node.type && ts.isTypeReferenceNode(node.type)
      && node.type.typeName.getText(source) === 'TableSchema' && node.initializer) {
      const initializer = unwrap(ts, node.initializer)
      if (ts.isObjectLiteralExpression(initializer)) {
        declaration = node
        object = initializer
        return
      }
    }
    if (!fallback && ts.isObjectLiteralExpression(node) && findProperty(ts, node, 'tableLabel')) {
      fallback = node
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  const found = declaration as TS.VariableDeclaration | null
  const rowType = found?.type && ts.isTypeReferenceNode(found.type) ? found.type.typeArguments?.[0] : undefined
  const rowName = rowType && ts.isTypeReferenceNode(rowType) ? rowType.typeName.getText(source) : null
  const row = rowName === null
    ? null
    : source.statements.find((statement): statement is TS.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === rowName) ?? null

  return { source, declaration: found, object: object ?? fallback, row }
}

function rangeOf (node: TS.Node, source: TS.SourceFile): TextRange {
  return { from: node.getStart(source), to: node.end }
}

export function toValue (ts: TypeScript, source: TS.SourceFile, node: TS.Expression): SchemaValue {
  const range = rangeOf(node, source)
  const inner = unwrap(ts, node)
  if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) {
    return { ...range, kind: 'string', value: inner.text }
  }
  if (ts.isNumericLiteral(inner)) {
    return { ...range, kind: 'number', value: Number(inner.text) }
  }
  if (ts.isPrefixUnaryExpression(inner) && inner.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(inner.operand)) {
    return { ...range, kind: 'number', value: -Number(inner.operand.text) }
  }
  if (inner.kind === ts.SyntaxKind.TrueKeyword || inner.kind === ts.SyntaxKind.FalseKeyword) {
    return { ...range, kind: 'boolean', value: inner.kind === ts.SyntaxKind.TrueKeyword }
  }
  if (ts.isArrayLiteralExpression(inner)) {
    return { ...range, kind: 'array', items: inner.elements.map(element => toValue(ts, source, element)) }
  }
  if (ts.isObjectLiteralExpression(inner)) {
    return { ...range, kind: 'object', properties: inner.properties.map(property => toProperty(ts, source, property)) }
  }
  if (ts.isCallExpression(inner) && (ts.isIdentifier(inner.expression) || ts.isPropertyAccessExpression(inner.expression))) {
    return { ...range, kind: 'call', callee: inner.expression.getText(source), args: inner.arguments.map(argument => toValue(ts, source, argument)) }
  }
  return { ...range, kind: 'code', text: node.getText(source) }
}

function toProperty (ts: TypeScript, source: TS.SourceFile, property: TS.ObjectLiteralElementLike): SchemaProperty {
  const range = rangeOf(property, source)
  const name = propertyName(ts, property)
  if (ts.isPropertyAssignment(property)) {
    return { ...range, name, value: toValue(ts, source, property.initializer) }
  }
  // 簡寫、方法與展開保留原文
  return { ...range, name: ts.isSpreadAssignment(property) ? null : name, value: { ...range, kind: 'code', text: property.getText(source) } }
}

function toRow (ts: TypeScript, source: TS.SourceFile, row: TS.InterfaceDeclaration): RowInterface {
  const members = row.members.flatMap(member => {
    const name = propertyName(ts, member)
    if (!ts.isPropertySignature(member) || name === null) {
      return []
    }
    return [{
      ...rangeOf(member, source),
      name,
      type: member.type?.getText(source) ?? 'any',
      readonly: member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false,
      optional: member.questionToken !== undefined,
    }]
  })
  return { ...rangeOf(row, source), name: row.name.text, members }
}

export function parseSchema (ts: TypeScript, text: string): SchemaModel {
  const nodes = findSchemaNodes(ts, parseSource(ts, text))
  const schema = nodes.object ? toValue(ts, nodes.source, nodes.object) : null
  return {
    variable: nodes.declaration && ts.isIdentifier(nodes.declaration.name) ? nodes.declaration.name.text : null,
    schema: schema?.kind === 'object' ? schema : null,
    row: nodes.row ? toRow(ts, nodes.source, nodes.row) : null,
  }
}

/** 陣列、物件或介面的各項，供 listEdits 使用 */
export function listSpanOf (ts: TypeScript, source: TS.SourceFile, node: TS.ArrayLiteralExpression | TS.ObjectLiteralExpression | TS.InterfaceDeclaration): ListSpan {
  if (ts.isInterfaceDeclaration(node)) {
    // members 的 pos 為 { 之後的位置
    return { open: node.members.pos, close: node.end - 1, items: node.members.map(member => rangeOf(member, source)), kind: 'members' }
  }
  const items: readonly TS.Node[] = ts.isArrayLiteralExpression(node) ? node.elements : node.properties
  return {
    open: node.getStart(source) + 1,
    close: node.end - 1,
    items: items.map(item => rangeOf(item, source)),
    kind: ts.isArrayLiteralExpression(node) ? 'array' : 'object',
  }
}

// 依路徑找到節點。找不到時為 undefined
export function nodeAtPath (ts: TypeScript, object: TS.ObjectLiteralExpression, path: SchemaPath): TS.Expression | undefined {
  let current: TS.Expression = object
  for (const step of path) {
    const inner = unwrap(ts, current)
    if (typeof step === 'string' && ts.isObjectLiteralExpression(inner)) {
      const property = findProperty(ts, inner, step)
      if (!property) {
        return undefined
      }
      current = property.initializer
    } else if (typeof step === 'number' && ts.isArrayLiteralExpression(inner)) {
      const element = inner.elements[step]
      if (!element) {
        return undefined
      }
      current = element
    } else {
      return undefined
    }
  }
  return current
}
