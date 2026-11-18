import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseSchema } from '../../server/schema/schemaModel'
import { columnKeyError } from '../../shared/schema'
import { columnOptions, columnRows, idCandidates, idPrefix, keyListItems, propertyBefore, sortItems, sourceOf, usedColumnKeys } from '../../shared/schemaForm'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

const OTHER = `import type { TableSchema } from '../types'
export const s: TableSchema = {
  tableLabel: 'a',
  idColumn: 'n',
  newId: () => 'x',
  columns: [{ key: 'n', type: 'number', showIf: row => true }, COLUMN],
  virtualColumns: [{ key: 'v', type: 'text', value: row => '' }],
  searchable: KEYS,
  defaultSort: [{ key: 'n', direction: DIRECTION }],
}
`

describe('schema form', () => {
  it('lists the real columns before the virtual ones', () => {
    const rows = columnRows(parseSchema(context.ts, OTHER))

    expect(rows.map(row => [row.path.join('.'), row.key, row.code])).toEqual([
      ['columns.0', 'n', null],
      ['columns.1', null, 'COLUMN'],
      ['virtualColumns.0', 'v', null],
    ])
  })

  it('offers real columns with string values as the primary key', () => {
    const rows = columnRows(parseSchema(context.ts, context.template))

    expect(idCandidates(rows, context.columnTypes)).toEqual(['code', 'name', 'status'])
  })

  it('reads the key lists and the default sort', () => {
    const template = parseSchema(context.ts, context.template)
    const other = parseSchema(context.ts, OTHER)

    expect(keyListItems(template, 'sortable')).toEqual(['date', 'amount'])
    expect(keyListItems(other, 'sortable')).toBeNull()
    expect(keyListItems(other, 'searchable')).toBeUndefined()
    expect(sortItems(template)).toEqual([{ key: 'date', direction: 'asc' }])
    expect(sortItems(other)).toBeUndefined()
  })

  it('reads the prefix of prefixedId', () => {
    expect(idPrefix(parseSchema(context.ts, context.template))).toBe('TPL')
    expect(idPrefix(parseSchema(context.ts, OTHER))).toBeNull()
    expect(idPrefix(parseSchema(context.ts, 'const s = { tableLabel: \'a\' }'))).toBe('')
  })

  it('finds the property to add a new one after', () => {
    const other = parseSchema(context.ts, OTHER)

    expect(propertyBefore(other, 'formOrder')).toBe('searchable')
    expect(propertyBefore(other, 'formatRules')).toBe('defaultSort')
    expect(propertyBefore(other, 'tableLabel')).toBeUndefined()
  })

  it('shows columns by label and falls back to the key', () => {
    expect(columnOptions(columnRows(parseSchema(context.ts, context.template))).slice(0, 2)).toEqual([
      { title: '編號', value: 'code' },
      { title: '名稱', value: 'name' },
    ])
    expect(columnOptions(columnRows(parseSchema(context.ts, OTHER)))).toEqual([{ title: 'n', value: 'n' }, { title: 'v', value: 'v' }])
  })

  it('reads the source of a value', () => {
    const rows = columnRows(parseSchema(context.ts, OTHER))
    const showIf = rows[0]?.object?.properties.find(property => property.name === 'showIf')?.value

    expect(sourceOf(OTHER, showIf)).toBe('row => true')
    expect(sourceOf(OTHER, undefined)).toBeNull()
  })

  it('lists the keys of the columns and the Row members', () => {
    const keys = usedColumnKeys(parseSchema(context.ts, context.template))

    expect(keys).toEqual(['code', 'name', 'amount', 'date', 'status'])
    expect(usedColumnKeys(null)).toEqual([])
  })

  it('checks a new column key', () => {
    expect(columnKeyError('note', ['name'])).toBeNull()
    expect(columnKeyError('', [])).toBe('請輸入 key。')
    expect(columnKeyError('note-1', [])).toMatch(/^key 只能使用/)
    expect(columnKeyError('id', [])).toMatch(/^id 為/)
    expect(columnKeyError('name', ['name'])).toBe('已有欄位 name。')
  })
})
