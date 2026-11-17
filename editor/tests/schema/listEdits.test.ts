import type { TypeScript } from '../../server/vueBuild'
import type TS from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyEdits, insertItem, isMultiline, moveItem, removeItem } from '../../server/schema/listEdits'
import { listSpanOf, parseSource } from '../../server/schema/schemaModel'
import { loadSchemaTestContext } from './setup'

let ts: TypeScript

beforeAll(async () => {
  ({ ts } = await loadSchemaTestContext())
}, 30_000)

// 文字中的第一個陣列或物件字面值
function firstList (text: string) {
  const source = parseSource(ts, text)
  let found: TS.ArrayLiteralExpression | TS.ObjectLiteralExpression | undefined
  const visit = (node: TS.Node): void => {
    if (!found && (ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node))) {
      found = node
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return listSpanOf(ts, source, found!)
}

const MULTILINE = `const a = [
  1,
  // two
  2,

  3 // three
]
`

describe('multiline lists', () => {
  it('detects the layout', () => {
    expect(isMultiline(MULTILINE, firstList(MULTILINE))).toBe(true)
    expect(isMultiline('const a = [1, 2]', firstList('const a = [1, 2]'))).toBe(false)
  })

  it('inserts a line with the same indent and adds the missing comma', () => {
    const list = firstList(MULTILINE)

    expect(applyEdits(MULTILINE, insertItem(MULTILINE, list, 1, 'x'))).toContain('  1,\n  x,\n  // two\n')
    expect(applyEdits(MULTILINE, insertItem(MULTILINE, list, 3, 'x'))).toContain('  3, // three\n  x,\n]')
  })

  it('removes an item with the comments above it', () => {
    expect(applyEdits(MULTILINE, removeItem(MULTILINE, firstList(MULTILINE), 1))).toBe('const a = [\n  1,\n\n  3 // three\n]\n')
  })

  it('moves an item with its comments and keeps the blank lines in place', () => {
    expect(applyEdits(MULTILINE, moveItem(MULTILINE, firstList(MULTILINE), 2, 0)))
      .toBe('const a = [\n  3, // three\n  1,\n\n  // two\n  2,\n]\n')
  })

  it('collapses a list whose last item is removed', () => {
    const text = 'const a = [\n  1,\n]\n'
    expect(applyEdits(text, removeItem(text, firstList(text), 0))).toBe('const a = []\n')
  })

  it('opens an empty list on new lines when asked', () => {
    const text = 'const a = {\n  b: [],\n}\n'
    const source = parseSource(ts, text)
    const array = ((source.statements[0] as TS.VariableStatement).declarationList.declarations[0]!.initializer as TS.ObjectLiteralExpression)
      .properties[0] as TS.PropertyAssignment
    const list = listSpanOf(ts, source, array.initializer as TS.ArrayLiteralExpression)

    expect(applyEdits(text, insertItem(text, list, 0, '{ c: 1 }', 'multiline'))).toBe('const a = {\n  b: [\n    { c: 1 },\n  ],\n}\n')
  })
})

describe('inline lists', () => {
  const text = 'const a = [\'x\', \'y\', \'z\']'

  it('inserts with a comma and a space', () => {
    expect(applyEdits(text, insertItem(text, firstList(text), 0, '\'w\''))).toBe('const a = [\'w\', \'x\', \'y\', \'z\']')
    expect(applyEdits(text, insertItem(text, firstList(text), 3, '\'w\''))).toBe('const a = [\'x\', \'y\', \'z\', \'w\']')
  })

  it('removes the item and one separator', () => {
    expect(applyEdits(text, removeItem(text, firstList(text), 1))).toBe('const a = [\'x\', \'z\']')
    expect(applyEdits(text, removeItem(text, firstList(text), 2))).toBe('const a = [\'x\', \'y\']')
  })

  it('moves an item', () => {
    expect(applyEdits(text, moveItem(text, firstList(text), 0, 2))).toBe('const a = [\'y\', \'z\', \'x\']')
  })

  it('pads the braces of an empty object', () => {
    expect(applyEdits('const a = {}', insertItem('const a = {}', firstList('const a = {}'), 0, 'b: 1'))).toBe('const a = { b: 1 }')
  })
})
