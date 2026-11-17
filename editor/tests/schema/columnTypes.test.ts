import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { readColumnTypes, readSchemaTypes } from '../../server/schema/columnTypes'
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
