import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { insertItem, moveItem, removeItem, replaceValue, SchemaEditError, setProperty } from '../../server/schema/schemaEdits'
import { literalText, propertyKeyText } from '../../shared/schema'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

describe('literal text', () => {
  it('writes strings with single quotes', () => {
    expect(literalText('it\'s \\ ok\n')).toBe(String.raw`'it\'s \\ ok\n'`)
    expect(literalText(['a', 'b'])).toBe('[\'a\', \'b\']')
    expect(literalText(3)).toBe('3')
  })

  it('quotes property names that are not identifiers', () => {
    expect(propertyKeyText('min')).toBe('min')
    expect(propertyKeyText('a-b')).toBe('\'a-b\'')
  })
})

describe('schema edits', () => {
  it('replaces a value at a path', () => {
    const text = replaceValue(context.ts, context.template, ['columns', 1, 'label'], '\'品名\'')

    expect(text).toContain('{ key: \'name\', label: \'品名\', type: \'text\', required: true },')
  })

  it('adds a property after another one', () => {
    const text = setProperty(context.ts, context.template, ['columns', 3], 'sheetHeader', '\'DATE\'', { after: 'label' })

    expect(text).toContain('{ key: \'date\', label: \'日期\', sheetHeader: \'DATE\', type: \'date\' },')
  })

  it('changes an existing property in place', () => {
    const text = setProperty(context.ts, context.template, [], 'idColumn', '\'name\'')

    expect(text).toContain('  // 主鍵的欄位，建立後不可修改\n  idColumn: \'name\',\n')
  })

  it('removes a property with the comment above it', () => {
    const text = setProperty(context.ts, context.template, [], 'newId', null)

    expect(text).not.toContain('newId')
    expect(text).not.toContain('新增時主鍵留空')
    expect(text).toContain('  labelColumn: \'name\',\n  columns: [\n')
  })

  it('removes a property from an inline object', () => {
    const text = setProperty(context.ts, context.template, ['columns', 2], 'min', null)

    expect(text).toContain('{ key: \'amount\', label: \'金額\', type: \'number\', separator: true },')
  })

  it('inserts, removes and moves array items', () => {
    const inserted = insertItem(context.ts, context.template, ['sortable'], 0, '\'name\'')
    expect(inserted).toContain('sortable: [\'name\', \'date\', \'amount\'],')

    const removed = removeItem(context.ts, context.template, ['columns'], 2)
    expect(removed).not.toContain('separator：')
    expect(removed).not.toContain('key: \'amount\'')

    const moved = moveItem(context.ts, context.template, ['detailOrder'], 3, 0)
    expect(moved).toContain('detailOrder: [\'date\', \'name\', \'status\', \'amount\'],')
  })

  it('reports paths that do not exist or are not written as literals', () => {
    expect(() => replaceValue(context.ts, context.template, ['missing'], '1')).toThrow(SchemaEditError)
    expect(() => insertItem(context.ts, context.template, ['newId'], 0, '1')).toThrow('newId 不是以陣列直接寫成。')
    expect(() => removeItem(context.ts, context.template, ['sortable'], 5)).toThrow(SchemaEditError)
    expect(() => replaceValue(context.ts, 'export const a = 1', ['b'], '1')).toThrow('找不到 schema 物件。')
  })
})
