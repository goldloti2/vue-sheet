import type { TypeScript } from '../server/vueBuild'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyMockTablesEdits, parseMockTables, readMockCsvPaths } from '../server/mockTables'
import { loadTypeScript } from '../server/vueBuild'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

let ts: TypeScript

beforeAll(async () => {
  ts = await loadTypeScript(vueBuildRoot)
}, 30_000)

describe('readMockCsvPaths', () => {
  it('maps each table to the imported CSV', () => {
    const text = [
      'import type { TableKey } from \'@/schema\'',
      'import orderCsv from \'../../../mock/order-test.csv?raw\'',
      'import customer from \'../../../mock/customer.csv?raw\'',
      '',
      'export const mockCsv: Partial<Record<TableKey, string>> = {',
      '  order: orderCsv,',
      '  customer,',
      '  \'line\': missingCsv,',
      '}',
    ].join('\n')

    expect(readMockCsvPaths(ts, text)).toEqual({
      order: 'vue-build/mock/order-test.csv',
      customer: 'vue-build/mock/customer.csv',
    })
  })
})

const TABLES = [
  'import type { TableKey } from \'@/schema\'',
  'import orderCsv from \'../../../mock/order-test.csv?raw\'',
  '',
  'export const mockCsv: Partial<Record<TableKey, string>> = {',
  '  order: orderCsv,',
  '}',
  '',
].join('\n')

describe('mock tables edits', () => {
  it('reads the registrations', () => {
    expect(parseMockTables(ts, TABLES)).toEqual({ csv: { order: 'vue-build/mock/order-test.csv' } })
    expect(parseMockTables(ts, 'export const other = {}')).toBeNull()
  })

  it('adds a registration with its import', () => {
    const text = applyMockTablesEdits(ts, TABLES, [{ kind: 'add', key: 'line', csvPath: 'vue-build/mock/line-test.csv' }])

    expect(text).toContain('import orderCsv from \'../../../mock/order-test.csv?raw\'\nimport lineCsv from \'../../../mock/line-test.csv?raw\'\n')
    expect(text).toContain('  order: orderCsv,\n  line: lineCsv,\n}')
  })

  it('removes a registration and its import', () => {
    const text = applyMockTablesEdits(ts, TABLES, [{ kind: 'remove', key: 'order' }])

    expect(text).not.toContain('orderCsv')
    expect(text).toContain('import type { TableKey } from \'@/schema\'\n\nexport const mockCsv')
  })
})
