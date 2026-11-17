// 欄位的新增、刪除與型別的修改，同時修改 Row 介面與同一檔案中以字面值寫成的引用
import type { ColumnTypeInfo, SchemaPath, SettingOption } from '../../shared/schema.ts'
import type { TypeScript } from '../vueBuild.ts'
import type TS from 'typescript'
import { literalText, propertyValue, stringValue } from '../../shared/schema.ts'
import { applyEdits, insertItem as insertListItem, removeItem as removeListItem } from './listEdits.ts'
import { insertItem, removeItem, replaceValue, SchemaEditError, setProperty } from './schemaEdits.ts'
import { findSchemaNodes, listSpanOf, parseSchema, parseSource, propertyName } from './schemaModel.ts'

export type ColumnList = 'columns' | 'virtualColumns'

export interface ColumnLocation {
  list: ColumnList
  index: number
}

export interface NewColumn {
  key: string
  label: string
  /** 欄位型別，例如 text */
  type: string
  virtual: boolean
}

const COLUMN_LISTS: readonly ColumnList[] = ['columns', 'virtualColumns']

// 以欄位的 key 為值的清單
const KEY_LISTS = ['searchable', 'sortable', 'detailOrder', 'formOrder'] as const

export function findColumn (ts: TypeScript, text: string, key: string): ColumnLocation | null {
  const { schema } = parseSchema(ts, text)
  for (const list of COLUMN_LISTS) {
    const array = propertyValue(schema, list)
    const index = array?.kind === 'array' ? array.items.findIndex(item => stringValue(propertyValue(item, 'key')) === key) : -1
    if (index !== -1) {
      return { list, index }
    }
  }
  return null
}

function typeInfo (columnTypes: readonly ColumnTypeInfo[], type: string): ColumnTypeInfo {
  const info = columnTypes.find(candidate => candidate.name === type)
  if (!info) {
    throw new SchemaEditError(`沒有欄位型別 ${type}。`)
  }
  return info
}

// 必填的型別設定的初始值。以程式碼輸入的設定沒有初始值
function initialOptionText (option: SettingOption): string | null {
  switch (option.control.kind) {
    case 'boolean': {
      return 'false'
    }
    case 'number': {
      return '0'
    }
    case 'string': {
      return literalText('')
    }
    case 'strings':
    case 'columns': {
      return '[]'
    }
    case 'choice': {
      return literalText(option.control.values[0] ?? '')
    }
    case 'column':
    case 'code': {
      return null
    }
  }
}

function requiredOptions (info: ColumnTypeInfo): [string, string][] {
  return info.options.flatMap(option => {
    const value = option.optional ? null : initialOptionText(option)
    return value === null ? [] : [[option.name, value] as [string, string]]
  })
}

// Row 介面

function rowNode (ts: TypeScript, text: string): { source: TS.SourceFile, row: TS.InterfaceDeclaration | null } {
  const nodes = findSchemaNodes(ts, parseSource(ts, text))
  return { source: nodes.source, row: nodes.row }
}

function rowMember (ts: TypeScript, row: TS.InterfaceDeclaration, name: string): TS.PropertySignature | undefined {
  return row.members.find((member): member is TS.PropertySignature => ts.isPropertySignature(member) && propertyName(ts, member) === name)
}

function isReadonly (ts: TypeScript, member: TS.TypeElement): boolean {
  return ts.canHaveModifiers(member) && (ts.getModifiers(member)?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false)
}

/** 新增 Row 的成員。真實欄位置於最後一個真實欄位之後，虛擬欄位置於最後。沒有 Row 介面時不修改 */
export function addRowMember (ts: TypeScript, text: string, name: string, type: string, virtual: boolean): string {
  const { source, row } = rowNode(ts, text)
  if (!row || rowMember(ts, row, name)) {
    return text
  }
  let index = row.members.length
  if (!virtual) {
    const lastReal = row.members.findLastIndex(member => !isReadonly(ts, member) && !(propertyName(ts, member) ?? '$').startsWith('$'))
    index = lastReal + 1
  }
  return applyEdits(text, insertListItem(text, listSpanOf(ts, source, row), index, `${virtual ? 'readonly ' : ''}${name}: ${type}`))
}

export function removeRowMember (ts: TypeScript, text: string, name: string): string {
  const { source, row } = rowNode(ts, text)
  const member = row ? rowMember(ts, row, name) : undefined
  return row && member ? applyEdits(text, removeListItem(text, listSpanOf(ts, source, row), row.members.indexOf(member))) : text
}

export function setRowMemberType (ts: TypeScript, text: string, name: string, type: string): string {
  const { source, row } = rowNode(ts, text)
  const member = row ? rowMember(ts, row, name) : undefined
  return member?.type ? applyEdits(text, [{ from: member.type.getStart(source), to: member.type.end, insert: type }]) : text
}

// 欄位

/** 新增欄位與 Row 的成員。必填的型別設定填入初始值，虛擬欄位的計算方式為 null。index 省略時加於最後 */
export function addColumn (ts: TypeScript, text: string, column: NewColumn, columnTypes: readonly ColumnTypeInfo[], index?: number): string {
  const info = typeInfo(columnTypes, column.type)
  const { row } = parseSchema(ts, text)
  if (findColumn(ts, text, column.key) || row?.members.some(member => member.name === column.key)) {
    throw new SchemaEditError(`已有欄位 ${column.key}。`)
  }
  const list: ColumnList = column.virtual ? 'virtualColumns' : 'columns'
  const properties: [string, string][] = [
    ['key', literalText(column.key)],
    ['label', literalText(column.label)],
    ['type', literalText(column.type)],
    ...requiredOptions(info),
    ...(column.virtual ? [['value', '() => null'] as [string, string]] : []),
  ]
  const itemText = `{ ${properties.map(([name, value]) => `${name}: ${value}`).join(', ')} }`

  let next = text
  if (!propertyValue(parseSchema(ts, next).schema, list)) {
    next = setProperty(ts, next, [], list, '[]', { after: 'columns' })
  }
  const array = propertyValue(parseSchema(ts, next).schema, list)
  const length = array?.kind === 'array' ? array.items.length : 0
  next = insertItem(ts, next, [list], index ?? length, itemText, 'multiline')
  return addRowMember(ts, next, column.key, info.valueType, column.virtual)
}

// 同一檔案中以字面值引用 key 的下一處：labelColumn、各清單、defaultSort 與 formatRules 的 columns
function nextReference (ts: TypeScript, text: string, key: string): { path: SchemaPath, index: number | null } | null {
  const { schema } = parseSchema(ts, text)
  if (!schema) {
    return null
  }
  if (stringValue(propertyValue(schema, 'labelColumn')) === key) {
    return { path: ['labelColumn'], index: null }
  }
  for (const name of KEY_LISTS) {
    const array = propertyValue(schema, name)
    const index = array?.kind === 'array' ? array.items.findIndex(item => stringValue(item) === key) : -1
    if (index !== -1) {
      return { path: [name], index }
    }
  }
  const sorts = propertyValue(schema, 'defaultSort')
  const sortIndex = sorts?.kind === 'array' ? sorts.items.findIndex(item => stringValue(propertyValue(item, 'key')) === key) : -1
  if (sortIndex !== -1) {
    return { path: ['defaultSort'], index: sortIndex }
  }
  const rules = propertyValue(schema, 'formatRules')
  if (rules?.kind === 'array') {
    for (const [ruleIndex, rule] of rules.items.entries()) {
      const columns = propertyValue(rule, 'columns')
      const index = columns?.kind === 'array' ? columns.items.findIndex(item => stringValue(item) === key) : -1
      if (index !== -1) {
        return { path: ['formatRules', ruleIndex, 'columns'], index }
      }
    }
  }
  return null
}

/** 刪除同一檔案中以字面值引用 key 之處。其他檔案中的引用由型別檢查列出 */
export function removeKeyReferences (ts: TypeScript, text: string, key: string): string {
  let next = text
  for (let reference = nextReference(ts, next, key); reference; reference = nextReference(ts, next, key)) {
    next = reference.index === null
      ? setProperty(ts, next, reference.path.slice(0, -1), String(reference.path.at(-1)), null)
      : removeItem(ts, next, reference.path, reference.index)
  }
  return next
}

/** 刪除欄位、Row 的成員，以及同一檔案中以字面值寫成的引用。主鍵的欄位不可刪除 */
export function removeColumn (ts: TypeScript, text: string, key: string): string {
  const location = findColumn(ts, text, key)
  if (!location) {
    throw new SchemaEditError(`找不到欄位 ${key}。`)
  }
  if (stringValue(propertyValue(parseSchema(ts, text).schema, 'idColumn')) === key) {
    throw new SchemaEditError(`${key} 為主鍵的欄位，無法刪除。請先改用其他欄位作為主鍵。`)
  }
  let next = removeItem(ts, text, [location.list], location.index)
  next = removeRowMember(ts, next, key)
  return removeKeyReferences(ts, next, key)
}

/** 修改欄位型別：刪除新型別沒有的型別設定，補上新型別必填的設定，並修改 Row 成員的型別 */
export function setColumnType (ts: TypeScript, text: string, key: string, type: string, columnTypes: readonly ColumnTypeInfo[]): string {
  const location = findColumn(ts, text, key)
  if (!location) {
    throw new SchemaEditError(`找不到欄位 ${key}。`)
  }
  const path: SchemaPath = [location.list, location.index]
  const array = propertyValue(parseSchema(ts, text).schema, location.list)
  const oldType = array?.kind === 'array' ? stringValue(propertyValue(array.items[location.index], 'type')) : null
  const newInfo = typeInfo(columnTypes, type)
  const oldOptions = oldType === null ? [] : columnTypes.find(info => info.name === oldType)?.options ?? []
  const kept = new Set(newInfo.options.map(option => option.name))

  let next = replaceValue(ts, text, [...path, 'type'], literalText(type))
  for (const option of oldOptions.filter(candidate => !kept.has(candidate.name))) {
    next = setProperty(ts, next, path, option.name, null)
  }
  const column = propertyValue(parseSchema(ts, next).schema, location.list)
  const item = column?.kind === 'array' ? column.items[location.index] : undefined
  let after = 'type'
  for (const [name, value] of requiredOptions(newInfo)) {
    if (!propertyValue(item, name)) {
      next = setProperty(ts, next, path, name, value, { after })
    }
    after = name
  }
  return setRowMemberType(ts, next, key, newInfo.valueType)
}
