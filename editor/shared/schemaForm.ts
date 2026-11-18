// 表單由 schema 的解析結果取得的資料。只讀取，修改經由 SchemaEdit
import type { ColumnTypeInfo, ObjectValue, SchemaModel, SchemaPath, SchemaValue } from './schema.ts'
import { propertyValue, stringValue } from './schema.ts'

export type ColumnList = 'columns' | 'virtualColumns'

export interface ColumnRow {
  list: ColumnList
  index: number
  path: SchemaPath
  /** 不是以字串直接寫值時為 null */
  key: string | null
  /** 欄位的物件。不是以物件直接寫成時為 null */
  object: ObjectValue | null
  /** 不是以物件直接寫成時為原文 */
  code: string | null
}

/** 以欄位的 key 為值的清單，依表單中的順序 */
export const KEY_LISTS = ['searchable', 'sortable', 'detailOrder', 'formOrder'] as const
export type KeyList = typeof KEY_LISTS[number]

// 值於檔案中的原文
export function sourceOf (text: string, value: SchemaValue | undefined): string | null {
  return value ? text.slice(value.from, value.to) : null
}

// 真實欄位在前，虛擬欄位在後
export function columnRows (model: SchemaModel | null): ColumnRow[] {
  return (['columns', 'virtualColumns'] as const).flatMap(list => {
    const array = propertyValue(model?.schema, list)
    if (array?.kind !== 'array') {
      return []
    }
    return array.items.map((item, index) => ({
      list,
      index,
      path: [list, index],
      key: stringValue(propertyValue(item, 'key')),
      object: item.kind === 'object' ? item : null,
      code: item.kind === 'object' ? null : (item.kind === 'code' ? item.text : ''),
    }))
  })
}

// 欄位與 Row 的成員已使用的名稱
export function usedColumnKeys (model: SchemaModel | null): string[] {
  const keys = columnRows(model).flatMap(row => row.key === null ? [] : [row.key])
  return [...new Set([...keys, ...model?.row?.members.map(member => member.name) ?? []])]
}

// 可作為主鍵的欄位：值的型別含 string 的真實欄位
export function idCandidates (rows: readonly ColumnRow[], columnTypes: readonly ColumnTypeInfo[]): string[] {
  const stringTypes = new Set(columnTypes.filter(info => /\bstring\b/.test(info.valueType)).map(info => info.name))
  return rows.flatMap(row => {
    const type = stringValue(propertyValue(row.object, 'type'))
    return row.list === 'columns' && row.key !== null && type !== null && stringTypes.has(type) ? [row.key] : []
  })
}

// 清單中以字串寫成的項目。清單不存在時為 null，不是以陣列直接寫成時為 undefined
export function keyListItems (model: SchemaModel | null, name: string): string[] | null | undefined {
  const value = propertyValue(model?.schema, name)
  if (!value) {
    return null
  }
  return value.kind === 'array' ? value.items.map(item => stringValue(item) ?? '') : undefined
}

// newId 寫成 prefixedId('字首') 時的字首。省略 newId 時為空字串，其他寫法為 null
export function idPrefix (model: SchemaModel | null): string | null {
  const value = propertyValue(model?.schema, 'newId')
  if (!value) {
    return ''
  }
  if (value.kind !== 'call' || value.callee !== 'prefixedId' || value.args.length !== 1) {
    return null
  }
  return stringValue(value.args[0])
}

// schema 物件的屬性於表單中新增時的順序
const SCHEMA_ORDER = ['tableLabel', 'idColumn', 'labelColumn', 'newId', 'columns', 'virtualColumns', ...KEY_LISTS, 'defaultSort', 'formatRules']

// 新增 name 時置於其後的屬性：順序在 name 之前、且已存在的最後一個屬性。沒有時為 undefined
export function propertyBefore (model: SchemaModel | null, name: string): string | undefined {
  const existing = new Set(model?.schema?.properties.map(property => property.name))
  return SCHEMA_ORDER.slice(0, Math.max(SCHEMA_ORDER.indexOf(name), 0)).findLast(candidate => existing.has(candidate))
}

export interface SortItem {
  key: string
  direction: 'asc' | 'desc'
}

// defaultSort 的各項。不存在時為 null，不是以字面值寫成時為 undefined
export function sortItems (model: SchemaModel | null): SortItem[] | null | undefined {
  const value = propertyValue(model?.schema, 'defaultSort')
  if (!value) {
    return null
  }
  if (value.kind !== 'array') {
    return undefined
  }
  const items = value.items.map(item => ({ key: stringValue(propertyValue(item, 'key')), direction: stringValue(propertyValue(item, 'direction')) }))
  return items.every((item): item is SortItem => item.key !== null && (item.direction === 'asc' || item.direction === 'desc')) ? items : undefined
}

export interface ColumnOption {
  /** 欄位的標籤。不是以字串直接寫值時為 key */
  title: string
  /** 欄位的 key */
  value: string
}

// 欄位的選項：以標籤顯示，值為 key
export function columnOptions (rows: readonly ColumnRow[]): ColumnOption[] {
  return rows.flatMap(row => row.key === null ? [] : [{ title: stringValue(propertyValue(row.object, 'label')) ?? row.key, value: row.key }])
}
