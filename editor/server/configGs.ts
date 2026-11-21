// apps-script/Config.gs：TABLES 與各項設定
import type { ConfigEdit, ConfigModel, ConfigTable, ConfigTableEntry, ConfigValue } from '../shared/configGs.ts'
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import { literalText, propertyKeyText } from '../shared/schema.ts'
import { applyEdits, insertItem, removeItem } from './schema/listEdits.ts'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { findProperty, listSpanOf, parseSource, propertyName, unwrap } from './schema/schemaModel.ts'
import { code, constantOf, numberOf, replaceConstant, replaceRange, stringOf } from './topLevelConstants.ts'

const LOCK_TIMEOUT = 'LOCK_TIMEOUT_MS'

function tablesObject (ts: TypeScript, source: TS.SourceFile): TS.ObjectLiteralExpression | null {
  const value = constantOf(ts, source, 'TABLES')
  const inner = value ? unwrap(ts, value) : null
  return inner && ts.isObjectLiteralExpression(inner) ? inner : null
}

// N * 1000 為 N 秒，只寫數字時以毫秒換算
function secondsOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | null): ConfigValue<number> {
  if (!node) {
    return null
  }
  const inner = unwrap(ts, node)
  if (ts.isNumericLiteral(inner)) {
    return { kind: 'value', value: Number(inner.text) / 1000 }
  }
  if (ts.isBinaryExpression(inner) && inner.operatorToken.kind === ts.SyntaxKind.AsteriskToken
    && ts.isNumericLiteral(inner.left) && ts.isNumericLiteral(inner.right) && Number(inner.right.text) === 1000) {
    return { kind: 'value', value: Number(inner.left.text) }
  }
  return code(node, source)
}

function authOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | null): ConfigValue<string | null> {
  if (!node) {
    return null
  }
  const inner = unwrap(ts, node)
  if (inner.kind === ts.SyntaxKind.NullKeyword) {
    return { kind: 'value', value: null }
  }
  return stringOf(ts, source, node)
}

function tableOf (ts: TypeScript, source: TS.SourceFile, property: TS.ObjectLiteralElementLike): ConfigTable {
  const key = propertyName(ts, property)
  const value = ts.isPropertyAssignment(property) ? unwrap(ts, property.initializer) : null
  if (!value || !ts.isObjectLiteralExpression(value)) {
    return { key, sheetName: code(property, source), idColumn: code(property, source) }
  }
  return {
    key,
    sheetName: stringOf(ts, source, findProperty(ts, value, 'sheetName')?.initializer),
    idColumn: stringOf(ts, source, findProperty(ts, value, 'idColumn')?.initializer),
  }
}

/** Config.gs 的各項設定 */
export function parseConfig (ts: TypeScript, text: string): ConfigModel {
  const source = parseSource(ts, text)
  return {
    tables: tablesObject(ts, source)?.properties.map(property => tableOf(ts, source, property)) ?? null,
    headerRow: numberOf(ts, source, constantOf(ts, source, 'HEADER_ROW')),
    lockTimeout: secondsOf(ts, source, constantOf(ts, source, LOCK_TIMEOUT)),
    auth: authOf(ts, source, constantOf(ts, source, 'AUTH')),
  }
}

/** TABLES 中各表的值。找不到 TABLES 物件時為 null */
export function readConfigTables (ts: TypeScript, text: string): Record<string, ConfigTableEntry> | null {
  const tables = parseConfig(ts, text).tables
  if (!tables) {
    return null
  }
  const valueOf = (value: ConfigValue<string>) => value?.kind === 'value' ? value.value : null
  return Object.fromEntries(tables.flatMap(table => table.key === null
    ? []
    : [[table.key, { sheetName: valueOf(table.sheetName), idColumn: valueOf(table.idColumn) }]]))
}

function loadTables (ts: TypeScript, text: string): { source: TS.SourceFile, object: TS.ObjectLiteralExpression } {
  const source = parseSource(ts, text)
  const object = tablesObject(ts, source)
  if (!object) {
    throw new SchemaEditError('Config.gs 中找不到 TABLES 物件，請以其他編輯器修改。')
  }
  return { source, object }
}

// TABLES 中此表的物件字面值
function tableObject (ts: TypeScript, object: TS.ObjectLiteralExpression, key: string): TS.ObjectLiteralExpression {
  const property = object.properties.find(item => propertyName(ts, item) === key)
  if (!property) {
    throw new SchemaEditError(`TABLES 中沒有 ${key}。`)
  }
  const value = ts.isPropertyAssignment(property) ? unwrap(ts, property.initializer) : null
  if (!value || !ts.isObjectLiteralExpression(value)) {
    throw new SchemaEditError(`TABLES 中的 ${key} 以程式碼寫成，請以其他編輯器修改。`)
  }
  return value
}

function setTable (ts: TypeScript, text: string, key: string, name: string, value: string): string {
  const { source, object } = loadTables(ts, text)
  const table = tableObject(ts, object, key)
  const property = findProperty(ts, table, name)
  if (property) {
    return replaceRange(text, property.initializer, source, literalText(value))
  }
  return applyEdits(text, insertItem(text, listSpanOf(ts, source, table), table.properties.length, `${name}: ${literalText(value)}`))
}

function addTable (ts: TypeScript, text: string, key: string, sheetName: string, idColumn: string): string {
  const { source, object } = loadTables(ts, text)
  if (object.properties.some(property => propertyName(ts, property) === key)) {
    return text
  }
  const item = `${propertyKeyText(key)}: { sheetName: ${literalText(sheetName)}, idColumn: ${literalText(idColumn)} }`
  return applyEdits(text, insertItem(text, listSpanOf(ts, source, object), object.properties.length, item, 'multiline'))
}

function removeTable (ts: TypeScript, text: string, key: string): string {
  const { source, object } = loadTables(ts, text)
  const index = object.properties.findIndex(property => propertyName(ts, property) === key)
  return index === -1 ? text : applyEdits(text, removeItem(text, listSpanOf(ts, source, object), index))
}

function renameIdColumn (ts: TypeScript, text: string, key: string, oldHeader: string, header: string): string {
  const source = parseSource(ts, text)
  const property = tablesObject(ts, source)?.properties.find(item => propertyName(ts, item) === key)
  const value = property && ts.isPropertyAssignment(property) ? unwrap(ts, property.initializer) : null
  const idColumn = value && ts.isObjectLiteralExpression(value) ? findProperty(ts, value, 'idColumn')?.initializer : undefined
  const current = stringOf(ts, source, idColumn)
  return idColumn && current?.kind === 'value' && current.value === oldHeader
    ? replaceRange(text, idColumn, source, literalText(header))
    : text
}

function applyEdit (ts: TypeScript, text: string, edit: ConfigEdit): string {
  switch (edit.kind) {
    case 'setTable': {
      return setTable(ts, text, edit.key, edit.name, edit.value)
    }
    case 'addTable': {
      return addTable(ts, text, edit.key, edit.sheetName, edit.idColumn)
    }
    case 'removeTable': {
      return removeTable(ts, text, edit.key)
    }
    case 'renameIdColumn': {
      return renameIdColumn(ts, text, edit.key, edit.oldHeader, edit.header)
    }
    case 'setHeaderRow': {
      return replaceConstant(ts, text, 'HEADER_ROW', String(edit.value), 'Config.gs')
    }
    case 'setLockTimeout': {
      return replaceConstant(ts, text, LOCK_TIMEOUT, `${edit.seconds} * 1000`, 'Config.gs')
    }
    case 'setAuth': {
      return replaceConstant(ts, text, 'AUTH', edit.value === null ? 'null' : literalText(edit.value), 'Config.gs')
    }
  }
}

/** 依序套用。任一項失敗時拋出錯誤 */
export function applyConfigEdits (ts: TypeScript, text: string, edits: readonly ConfigEdit[]): string {
  let next = text
  for (const edit of edits) {
    next = applyEdit(ts, next, edit)
  }
  return next
}
