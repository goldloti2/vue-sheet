import type { TypeScript } from '../../server/vueBuild'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyRegistryEdits, parseRegistry } from '../../server/schema/registry'
import { loadTypeScript } from '../../server/vueBuild'
import { registryAddBefore } from '../../shared/registry'

const vueBuildRoot = fileURLToPath(new URL('../../../vue-build', import.meta.url))

let ts: TypeScript

beforeAll(async () => {
  ts = await loadTypeScript(vueBuildRoot)
}, 30_000)

const TEXT = [
  'import { customerSchema } from \'./tables/customer\'',
  'import { orderSchema } from \'./tables/order\'',
  '',
  'export const schemas = {',
  '  order: orderSchema,',
  '  customer: customerSchema,',
  '}',
  '',
  'export type TableKey = keyof typeof schemas',
  '',
].join('\n')

describe('registry', () => {
  it('reads the tables in order', () => {
    expect(parseRegistry(ts, TEXT)).toEqual({
      entries: [{ key: 'order', variable: 'orderSchema' }, { key: 'customer', variable: 'customerSchema' }],
    })
    expect(parseRegistry(ts, 'export const other = {}')).toBeNull()
  })

  it('moves a table', () => {
    expect(applyRegistryEdits(ts, TEXT, [{ kind: 'move', from: 1, to: 0 }])).toContain('  customer: customerSchema,\n  order: orderSchema,\n')
  })

  it('removes a table and its import', () => {
    const text = applyRegistryEdits(ts, TEXT, [{ kind: 'remove', key: 'customer' }])

    expect(text).not.toContain('customer')
    expect(text).toContain('import { orderSchema } from \'./tables/order\'\n\nexport const schemas = {\n  order: orderSchema,\n}')
  })

  it('adds a table at the end with its import', () => {
    const text = applyRegistryEdits(ts, TEXT, [{ kind: 'add', key: 'line', variable: 'lineSchema' }])

    expect(text).toContain('import { lineSchema } from \'./tables/line\'\n')
    expect(text).toContain('  customer: customerSchema,\n  line: lineSchema,\n}')
  })

  it('adds a table before another table', () => {
    const text = applyRegistryEdits(ts, TEXT, [{ kind: 'add', key: 'line', variable: 'lineSchema', before: 'customer' }])

    expect(text).toContain('  order: orderSchema,\n  line: lineSchema,\n  customer: customerSchema,\n}')
  })

  it('places a table before the first virtual table, and a virtual table at the end', () => {
    const model = parseRegistry(ts, TEXT)!
    const isVirtual = (key: string) => key === 'customer'

    expect(registryAddBefore(model, isVirtual, false)).toBe('customer')
    expect(registryAddBefore(model, isVirtual, true)).toBeUndefined()
    expect(registryAddBefore(model, () => false, false)).toBeUndefined()
  })

  it('rejects a table that is already registered or missing', () => {
    expect(() => applyRegistryEdits(ts, TEXT, [{ kind: 'add', key: 'order', variable: 'orderSchema' }])).toThrow('schemas 中已有 order。')
    expect(() => applyRegistryEdits(ts, TEXT, [{ kind: 'remove', key: 'line' }])).toThrow('schemas 中沒有 line。')
  })
})
