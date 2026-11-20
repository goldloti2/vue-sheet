import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseSchema } from '../../server/schema/schemaModel'
import { propertyValue } from '../../shared/schema'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

describe('parseSchema', () => {
  it('finds the schema variable and its Row interface', () => {
    const model = parseSchema(context.ts, context.template)

    expect(model.variable).toBe('__table__Schema')
    expect(model.row?.name).toBe('__Table__Row')
    expect(model.row?.members.map(member => `${member.name}: ${member.type}`)).toEqual([
      'code: string | null',
      'name: string | null',
      'amount: number | null',
      'date: Date | null',
      'status: string | null',
    ])
  })

  it('turns literals into values and keeps the source range', () => {
    const { schema } = parseSchema(context.ts, context.template)
    const label = propertyValue(schema, 'tableLabel')

    expect(label).toMatchObject({ kind: 'string', value: '範本' })
    expect(context.template.slice(label!.from, label!.to)).toBe('\'範本\'')
    expect(propertyValue(schema, 'newId')).toMatchObject({ kind: 'call', callee: 'prefixedId', args: [{ kind: 'string', value: 'TPL' }] })

    const columns = propertyValue(schema, 'columns')
    const amount = columns?.kind === 'array' ? columns.items[2] : undefined
    expect(propertyValue(amount, 'min')).toMatchObject({ kind: 'number', value: 0 })
    expect(propertyValue(amount, 'separator')).toMatchObject({ kind: 'boolean', value: true })
  })

  it('finds a VirtualTableSchema variable and marks it virtual', () => {
    const text = `import type { VirtualTableSchema } from './types'
interface R { kind: string | null }
export const s: VirtualTableSchema<R> = {
  tableLabel: '虛擬',
  columns: [{ key: 'kind', label: '種類', type: 'text' }],
  rules: [],
}
`
    const model = parseSchema(context.ts, text)

    expect(model.variable).toBe('s')
    expect(model.row?.name).toBe('R')
    expect(model.virtual).toBe(true)
    expect(parseSchema(context.ts, context.template).virtual).toBe(false)
  })

  it('keeps other forms as code', () => {
    const text = `import type { TableSchema } from './types'
interface R { readonly total?: number }
export const s: TableSchema<R> = {
  tableLabel: LABEL,
  columns: [{ key: 'a', min: -1, showIf: row => row.a > 0 }, ...extra],
}
`
    const model = parseSchema(context.ts, text)
    const columns = propertyValue(model.schema, 'columns')

    expect(model.row?.members[0]).toMatchObject({ name: 'total', readonly: true, optional: true })
    expect(propertyValue(model.schema, 'tableLabel')).toMatchObject({ kind: 'code', text: 'LABEL' })
    expect(columns?.kind === 'array' && columns.items[1]).toMatchObject({ kind: 'code', text: '...extra' })
    const first = columns?.kind === 'array' ? columns.items[0] : undefined
    expect(propertyValue(first, 'min')).toMatchObject({ kind: 'number', value: -1 })
    expect(propertyValue(first, 'showIf')).toMatchObject({ kind: 'code', text: 'row => row.a > 0' })
  })

  it('has no schema without a schema object', () => {
    expect(parseSchema(context.ts, 'export const a = 1')).toEqual({ variable: null, schema: null, row: null, virtual: false })
  })
})
