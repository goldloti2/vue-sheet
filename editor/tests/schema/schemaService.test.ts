import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { ensureNamedImport, SchemaEditError } from '../../server/schema/schemaEdits'
import { applySchemaEdits, codeContext } from '../../server/schema/schemaService'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

describe('applySchemaEdits', () => {
  it('applies the edits in order', () => {
    const text = applySchemaEdits(context.ts, context.template, [
      { kind: 'setColumnType', key: 'date', type: 'text' },
      { kind: 'setProperty', objectPath: ['columns', 3], name: 'multiline', valueText: 'true', after: 'type' },
      { kind: 'move', arrayPath: ['sortable'], from: 1, to: 0 },
    ], context.columnTypes)

    expect(text).toContain('{ key: \'date\', label: \'日期\', type: \'text\', multiline: true },')
    expect(text).toContain('sortable: [\'amount\', \'date\'],')
  })

  it('adds and removes columns', () => {
    const text = applySchemaEdits(context.ts, context.template, [
      { kind: 'addColumn', column: { key: 'note', label: '備註', type: 'text', virtual: false } },
      { kind: 'removeColumn', key: 'status' },
    ], context.columnTypes)

    expect(text).toContain('    { key: \'note\', label: \'備註\', type: \'text\' },\n  ],')
    expect(text).not.toMatch(/'status'/)
  })

  it('checks code before writing it', () => {
    expect(() => applySchemaEdits(context.ts, context.template, [
      { kind: 'setProperty', objectPath: ['columns', 0], name: 'showIf', valueText: 'row =>', code: true },
    ], context.columnTypes)).toThrow(SchemaEditError)
  })
})

describe('codeContext', () => {
  it('splits the file around an existing value', () => {
    const { prefix, suffix } = codeContext(context.ts, context.template, [], 'tableLabel')

    expect(prefix.endsWith('  tableLabel: ')).toBe(true)
    expect(suffix.startsWith(',\n  // 主鍵的欄位')).toBe(true)
  })

  it('splits the file where a missing property would be added', () => {
    const { prefix, suffix } = codeContext(context.ts, context.template, ['columns', 3], 'showIf')

    expect(prefix.endsWith('{ key: \'date\', label: \'日期\', type: \'date\', showIf: ')).toBe(true)
    expect(suffix.startsWith(' },')).toBe(true)
  })
})

describe('ensureNamedImport', () => {
  it('adds the name to an import from the same source', () => {
    const text = 'import type { A } from \'../types\'\nimport { b } from \'../types\'\n\nconst x = 1\n'

    expect(ensureNamedImport(context.ts, text, 'prefixedId', '../types')).toBe('import type { A } from \'../types\'\nimport { b, prefixedId } from \'../types\'\n\nconst x = 1\n')
  })

  it('adds an import line after the last import', () => {
    const text = 'import type { A } from \'../types\'\n\nconst x = 1\n'

    expect(ensureNamedImport(context.ts, text, 'prefixedId', '../types')).toBe('import type { A } from \'../types\'\nimport { prefixedId } from \'../types\'\n\nconst x = 1\n')
  })

  it('keeps a file that imports the name already', () => {
    const text = 'import { prefixedId } from \'../types\'\n'

    expect(ensureNamedImport(context.ts, text, 'prefixedId', '../types')).toBe(text)
  })
})
