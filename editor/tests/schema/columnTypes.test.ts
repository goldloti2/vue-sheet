import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { readColumnTypes, readPropertyDocs, readSchemaTypes } from '../../server/schema/columnTypes'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

describe('readColumnTypes', () => {
  it('reads every column type of types.ts with its value type', () => {
    expect(context.columnTypes.map(info => [info.name, info.valueType])).toContainEqual(['date', 'Date | null'])
    expect(context.columnTypes.find(info => info.name === 'text')?.doc).toBeTruthy()
  })

  it('chooses a control by the option type', () => {
    const text = `interface ColumnTypes {
  /** 說明 */
  a: { value: string | null, extra: { flag?: boolean, size: number, name: string, list: string[], mode?: 'x' | 'y', fn?: () => void } }
  b: { value: Date | null }
}`
    const [a, b] = readColumnTypes(context.ts, text)

    expect(a).toMatchObject({ name: 'a', valueType: 'string | null', doc: '說明' })
    expect(a?.options.map(option => [option.name, option.optional, option.control])).toEqual([
      ['flag', true, { kind: 'boolean' }],
      ['size', false, { kind: 'number' }],
      ['name', false, { kind: 'string' }],
      ['list', false, { kind: 'strings' }],
      ['mode', true, { kind: 'choice', values: ['x', 'y'] }],
      ['fn', true, { kind: 'code' }],
    ])
    expect(b).toMatchObject({ name: 'b', options: [] })
  })

  it('reads column keys and type aliases', () => {
    const text = `type ColorName = 'red' | 'blue'
interface ColumnTypes {}
interface FormatRule<Row> {
  when: (row: Row) => boolean
  columns: RowKey<Row>[]
  color?: ColorName
  sortBy?: RowKey<Row>
}`
    const { formatRule } = readSchemaTypes(context.ts, text, { light: {}, dark: {} })

    expect(formatRule.map(option => [option.name, option.control])).toEqual([
      ['when', { kind: 'code' }],
      ['columns', { kind: 'columns' }],
      ['color', { kind: 'choice', values: ['red', 'blue'] }],
      ['sortBy', { kind: 'column' }],
    ])
  })

  it('returns nothing without ColumnTypes', () => {
    expect(readColumnTypes(context.ts, 'export const a = 1')).toEqual([])
  })
})

describe('readPropertyDocs', () => {
  it('reads the docs of properties in aliases, intersections and mapped types', () => {
    const text = `type Base = {
  /** 第一個 */
  a?: string
  b?: number
}
type Column = {
  [T in 'x' | 'y']: Base & {
    /** 第二個 */
    c?: () => void
    /** 不取用 */
    a?: string
  }
}[ 'x' | 'y']
interface Other {
  /** 不讀取 */
  d: string
}`

    expect(readPropertyDocs(context.ts, text, ['Base', 'Column'])).toEqual({ a: '第一個', c: '第二個' })
  })

  it('reads the column and schema settings of types.ts', () => {
    const types = readSchemaTypes(context.ts, context.typesText, { light: {}, dark: {} })

    for (const name of ['default', 'validate', 'showIf', 'value']) {
      expect(types.columnDocs[name]).toBeTruthy()
    }
    expect(types.schemaDocs.newId).toBeTruthy()
    expect(types.schemaDocs.tableLabel).toBeTruthy()
    expect(types.schemaDocs.rules).toBeTruthy()
    for (const name of ['table', 'when', 'values']) {
      expect(types.ruleDocs[name]).toBeTruthy()
    }
  })
})
