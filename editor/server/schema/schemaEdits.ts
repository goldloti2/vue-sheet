// 修改 schema 物件的文字：取代值、設定屬性、陣列的插入、刪除與移動。每次修改皆重新解析，回傳修改後的全文
import type { SchemaPath } from '../../shared/schema.ts'
import type { TypeScript } from '../vueBuild.ts'
import type { ListSpan } from './listEdits.ts'
import type { SchemaNodes } from './schemaModel.ts'
import type TS from 'typescript'
import { literalText, propertyKeyText } from '../../shared/schema.ts'
import { applyEdits, insertItem as insertListItem, moveItem as moveListItem, removeItem as removeListItem } from './listEdits.ts'
import { findProperty, findSchemaNodes, listSpanOf, nodeAtPath, parseSource, unwrap } from './schemaModel.ts'

export class SchemaEditError extends Error {}

export type ListLayout = 'inline' | 'multiline'

export function loadSchemaNodes (ts: TypeScript, text: string): SchemaNodes & { object: TS.ObjectLiteralExpression } {
  const nodes = findSchemaNodes(ts, parseSource(ts, text))
  if (!nodes.object) {
    throw new SchemaEditError('找不到 schema 物件。')
  }
  return { ...nodes, object: nodes.object }
}

function pathText (path: SchemaPath): string {
  return path.length === 0 ? 'schema' : path.join('.')
}

function nodeAt (ts: TypeScript, nodes: ReturnType<typeof loadSchemaNodes>, path: SchemaPath): TS.Expression {
  const node = nodeAtPath(ts, nodes.object, path)
  if (!node) {
    throw new SchemaEditError(`找不到 ${pathText(path)}。`)
  }
  return unwrap(ts, node)
}

function arrayAt (ts: TypeScript, nodes: ReturnType<typeof loadSchemaNodes>, path: SchemaPath): TS.ArrayLiteralExpression {
  const node = nodeAt(ts, nodes, path)
  if (!ts.isArrayLiteralExpression(node)) {
    throw new SchemaEditError(`${pathText(path)} 不是以陣列直接寫成。`)
  }
  return node
}

function objectAt (ts: TypeScript, nodes: ReturnType<typeof loadSchemaNodes>, path: SchemaPath): TS.ObjectLiteralExpression {
  const node = nodeAt(ts, nodes, path)
  if (!ts.isObjectLiteralExpression(node)) {
    throw new SchemaEditError(`${pathText(path)} 不是以物件直接寫成。`)
  }
  return node
}

/** 以 valueText 取代路徑上的值 */
export function replaceValue (ts: TypeScript, text: string, path: SchemaPath, valueText: string): string {
  const nodes = loadSchemaNodes(ts, text)
  const node = nodeAtPath(ts, nodes.object, path)
  if (!node || path.length === 0) {
    throw new SchemaEditError(`找不到 ${pathText(path)}。`)
  }
  return applyEdits(text, [{ from: node.getStart(nodes.source), to: node.end, insert: valueText }])
}

export interface PropertyPlacement {
  /** 新增的屬性置於此屬性之後。此屬性不存在時置於最後 */
  after?: string
  /** 物件沒有屬性時的版面 */
  emptyLayout?: ListLayout
}

/** 設定物件的屬性。valueText 為 null 時刪除此屬性。不存在的屬性依 placement 新增 */
export function setProperty (ts: TypeScript, text: string, objectPath: SchemaPath, name: string, valueText: string | null, placement: PropertyPlacement = {}): string {
  const nodes = loadSchemaNodes(ts, text)
  const object = objectAt(ts, nodes, objectPath)
  const existing = findProperty(ts, object, name)
  const list = listSpanOf(ts, nodes.source, object)

  if (valueText === null) {
    return existing ? applyEdits(text, removeListItem(text, list, object.properties.indexOf(existing))) : text
  }
  if (existing) {
    return applyEdits(text, [{ from: existing.initializer.getStart(nodes.source), to: existing.initializer.end, insert: valueText }])
  }
  const anchor = placement.after === undefined ? undefined : findProperty(ts, object, placement.after)
  const index = anchor ? object.properties.indexOf(anchor) + 1 : object.properties.length
  return applyEdits(text, insertListItem(text, list, index, `${propertyKeyText(name)}: ${valueText}`, placement.emptyLayout))
}

/** 於陣列的 index 之前插入一項，index 為長度時加於最後 */
export function insertItem (ts: TypeScript, text: string, arrayPath: SchemaPath, index: number, itemText: string, emptyLayout?: ListLayout): string {
  const nodes = loadSchemaNodes(ts, text)
  const array = arrayAt(ts, nodes, arrayPath)
  const at = Math.min(Math.max(index, 0), array.elements.length)
  return applyEdits(text, insertListItem(text, listSpanOf(ts, nodes.source, array), at, itemText, emptyLayout))
}

export function removeItem (ts: TypeScript, text: string, arrayPath: SchemaPath, index: number): string {
  const nodes = loadSchemaNodes(ts, text)
  const array = arrayAt(ts, nodes, arrayPath)
  if (index < 0 || index >= array.elements.length) {
    throw new SchemaEditError(`找不到 ${pathText([...arrayPath, index])}。`)
  }
  return applyEdits(text, removeListItem(text, listSpanOf(ts, nodes.source, array), index))
}

/** 把陣列的一項移到 to，to 為移動後的索引 */
export function moveItem (ts: TypeScript, text: string, arrayPath: SchemaPath, from: number, to: number): string {
  const nodes = loadSchemaNodes(ts, text)
  const array = arrayAt(ts, nodes, arrayPath)
  return applyEdits(text, moveListItem(text, listSpanOf(ts, nodes.source, array), from, to))
}

/** 沒有此具名匯入時加上。有同一來源的一般匯入時加入其中，否則於最後一個匯入之後另加一行 */
export function ensureNamedImport (ts: TypeScript, text: string, name: string, from: string): string {
  const source = parseSource(ts, text)
  const imports = source.statements.filter((statement): statement is TS.ImportDeclaration => ts.isImportDeclaration(statement))
  const imported = imports.some(declaration => {
    const bindings = declaration.importClause?.namedBindings
    return !declaration.importClause?.isTypeOnly && bindings && ts.isNamedImports(bindings)
      && bindings.elements.some(element => !element.isTypeOnly && element.name.text === name)
  })
  if (imported) {
    return text
  }
  const sameSource = imports.find(declaration => !declaration.importClause?.isTypeOnly
    && ts.isStringLiteral(declaration.moduleSpecifier) && declaration.moduleSpecifier.text === from
    && declaration.importClause?.namedBindings && ts.isNamedImports(declaration.importClause.namedBindings))
  const bindings = sameSource?.importClause?.namedBindings
  if (bindings && ts.isNamedImports(bindings)) {
    const list: ListSpan = { open: bindings.getStart(source) + 1, close: bindings.end - 1, items: bindings.elements.map(element => ({ from: element.getStart(source), to: element.end })), kind: 'object' }
    return applyEdits(text, insertListItem(text, list, bindings.elements.length, name))
  }
  const last = imports.at(-1)
  const line = `import { ${name} } from ${literalText(from)}\n`
  return last ? applyEdits(text, [{ from: last.end + 1, to: last.end + 1, insert: line }]) : line + text
}
