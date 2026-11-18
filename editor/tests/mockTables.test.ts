import type { TypeScript } from '../server/vueBuild'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { readMockCsvPaths } from '../server/mockTables'
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
