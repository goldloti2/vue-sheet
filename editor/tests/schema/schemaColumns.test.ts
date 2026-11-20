import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { addColumn, findColumn, removeColumn, removeKeyReferences, renameKeyLiterals, rowMemberNameStart, setColumnType } from '../../server/schema/schemaColumns'
import { body, loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

describe('schema columns', () => {
  it('finds real and virtual columns', () => {
    expect(findColumn(context.ts, context.template, 'date')).toEqual({ list: 'columns', index: 3 })
    expect(findColumn(context.ts, context.template, 'missing')).toBeNull()
  })

  it('adds a real column with its required options and a Row member', () => {
    const text = addColumn(context.ts, context.template, { key: 'kind', label: '種類', type: 'select', virtual: false }, context.columnTypes)

    expect(text).toContain('    { key: \'kind\', label: \'種類\', type: \'select\', options: [] },\n  ],')
    expect(body(text)).toContain('  status: string | null\n  kind: string | null\n}')
  })

  it('adds a virtual column and creates virtualColumns after columns', () => {
    const text = addColumn(context.ts, context.template, { key: 'total', label: '總額', type: 'number', virtual: true }, context.columnTypes)

    expect(text).toContain('  ],\n  virtualColumns: [\n    { key: \'total\', label: \'總額\', type: \'number\', value: () => null },\n  ],\n')
    expect(text).toContain('  readonly total: number | null\n}')
    expect(findColumn(context.ts, text, 'total')).toEqual({ list: 'virtualColumns', index: 0 })
  })

  it('places a real column before the readonly members of Row', () => {
    const withVirtual = addColumn(context.ts, context.template, { key: 'total', label: '總額', type: 'number', virtual: true }, context.columnTypes)
    const text = addColumn(context.ts, withVirtual, { key: 'note', label: '備註', type: 'text', virtual: false }, context.columnTypes, 0)

    expect(text).toContain('  columns: [\n    { key: \'note\', label: \'備註\', type: \'text\' },\n')
    expect(body(text)).toContain('  status: string | null\n  note: string | null\n  readonly total: number | null\n}')
  })

  it('rejects a key that already exists', () => {
    expect(() => addColumn(context.ts, context.template, { key: 'date', label: '日', type: 'date', virtual: false }, context.columnTypes)).toThrow('已有欄位 date。')
  })

  it('removes a column, its Row member and its references in the file', () => {
    const text = removeColumn(context.ts, context.template, 'date')

    expect(text).not.toMatch(/'date'/)
    expect(body(text)).not.toContain('date: Date | null')
    expect(text).toContain('searchable: [\'name\', \'amount\', \'status\'],')
    expect(text).toContain('defaultSort: [],')
  })

  it('removes labelColumn with its comment', () => {
    const text = removeColumn(context.ts, context.template, 'name')

    expect(text).not.toContain('labelColumn')
    expect(text).not.toContain('稱呼一列所用的欄位')
  })

  it('removes the key from the columns of format rules', () => {
    const text = 'const s = { tableLabel: \'a\', formatRules: [{ when: () => true, columns: [\'a\', \'b\'] }] }'

    expect(removeKeyReferences(context.ts, text, 'a')).toBe('const s = { tableLabel: \'a\', formatRules: [{ when: () => true, columns: [\'b\'] }] }')
  })

  it('removes the key from the values of virtual table rules', () => {
    const text = 'const s = { tableLabel: \'a\', rules: [{ table: \'t\', values: { a: 1, b: 2 } }, { table: \'t\', values: { a: x => x.id } }] }'

    expect(removeKeyReferences(context.ts, text, 'a')).toBe('const s = { tableLabel: \'a\', rules: [{ table: \'t\', values: { b: 2 } }, { table: \'t\', values: {} }] }')
  })

  it('rejects a key that cannot be used', () => {
    expect(() => addColumn(context.ts, context.template, { key: 'id', label: 'ID', type: 'text', virtual: false }, context.columnTypes)).toThrow('id 為每一列共有的屬性')
    expect(() => addColumn(context.ts, context.template, { key: '1st', label: '第一', type: 'text', virtual: false }, context.columnTypes)).toThrow('key 只能使用')
  })

  it('renames the key literals in the file', () => {
    const text = renameKeyLiterals(context.ts, context.template, 'date', 'orderedAt')

    expect(text).toContain('{ key: \'orderedAt\', label: \'日期\', type: \'date\' },')
    expect(text).toContain('searchable: [\'name\', \'orderedAt\', \'amount\', \'status\'],')
    expect(text).toContain('{ key: \'orderedAt\', direction: \'asc\' },')
    expect(text.match(/'date'/g)).toEqual(['\'date\''])
    expect(body(text)).toContain('  date: Date | null\n')
  })

  it('renames idColumn, labelColumn and the columns of format rules', () => {
    const text = 'const s = { tableLabel: \'a\', idColumn: \'a\', labelColumn: \'a\', formatRules: [{ when: () => true, columns: [\'b\', \'a\'] }] }'

    expect(renameKeyLiterals(context.ts, text, 'a', 'c')).toBe('const s = { tableLabel: \'a\', idColumn: \'c\', labelColumn: \'c\', formatRules: [{ when: () => true, columns: [\'b\', \'c\'] }] }')
  })

  it('renames the keys in the values of virtual table rules', () => {
    const text = 'const s = { tableLabel: \'a\', rules: [{ table: \'t\', values: { a: 1, \'b\': 2 } }, { table: \'t\', values: { a: x => x.a } }] }'

    expect(renameKeyLiterals(context.ts, text, 'a', 'c')).toBe('const s = { tableLabel: \'a\', rules: [{ table: \'t\', values: { c: 1, \'b\': 2 } }, { table: \'t\', values: { c: x => x.a } }] }')
  })

  it('finds the name of a Row member', () => {
    const start = rowMemberNameStart(context.ts, context.template, 'amount')!

    expect(context.template.slice(start, start + 'amount: number'.length)).toBe('amount: number')
    expect(rowMemberNameStart(context.ts, context.template, 'missing')).toBeNull()
  })

  it('keeps the primary key column', () => {
    expect(() => removeColumn(context.ts, context.template, 'code')).toThrow('code 為主鍵的欄位')
  })

  it('changes the type, its options and the Row member type', () => {
    const text = setColumnType(context.ts, context.template, 'amount', 'select', context.columnTypes)

    expect(text).toContain('{ key: \'amount\', label: \'金額\', type: \'select\', options: [] },')
    expect(body(text)).toContain('  amount: string | null\n')
  })
})
