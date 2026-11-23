import type { TableTools } from '../server/tables'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockCsv, createTable, deleteTable } from '../server/tables'
import { loadTypeScript } from '../server/vueBuild'
import { tableDeletionFiles } from '../shared/tableFiles'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

const REGISTRY = [
  'import { orderSchema } from \'./tables/order\'',
  '',
  'export const schemas = {',
  '  order: orderSchema,',
  '}',
  '',
].join('\n')

const ACTIONS_REGISTRY = [
  'import type { TableKey } from \'@/schema\'',
  'import { useOrderActions } from \'./useOrderActions\'',
  '',
  'export const tableActions = {',
  '  order: useOrderActions,',
  '} satisfies { [K in TableKey]?: (...args: never[]) => object }',
  '',
].join('\n')

const CONFIG = [
  'const TABLES = {',
  '  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },',
  '}',
  '',
].join('\n')

const MOCK_TABLES = [
  'import orderCsv from \'../../../mock/order-test.csv?raw\'',
  '',
  'export const mockCsv = {',
  '  order: orderCsv,',
  '}',
  '',
].join('\n')

// 暫存資料夾中的小專案。範本自 repo 複製，只讀取
let root: string
let tools: TableTools

async function put (file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true })
  await writeFile(path.join(root, file), text)
}

const read = (file: string) => readFile(path.join(root, file), 'utf8')

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'editor-tables-'))
  await cp(path.join(repoRoot, 'vue-build/template/table'), path.join(root, 'vue-build/template/table'), { recursive: true })
  await put('vue-build/src/schema/index.ts', REGISTRY)
  await put('vue-build/src/composables/actions/index.ts', ACTIONS_REGISTRY)
  await put('vue-build/src/services/mock/tables.ts', MOCK_TABLES)
  await put('vue-build/src/schema/tables/order.ts', 'export const orderSchema = {}\n')
  await put('vue-build/mock/order-test.csv', 'ORD-ID\n')
  tools = { ts: await loadTypeScript(path.join(repoRoot, 'vue-build')), root, format: async (_file, text) => text }
}, 30_000)

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('createTable', () => {
  it('copies the template with only the primary key and the name', async () => {
    const result = await createTable(tools, { key: 'orderLine', label: '訂單明細', prefix: 'OL', virtual: false, sheetName: '' })

    expect(result.created).toEqual([
      'vue-build/src/schema/tables/orderLine.ts',
      'vue-build/src/composables/actions/useOrderLineActions.ts',
      'vue-build/mock/orderLine-test.csv',
    ])
    const schema = await read('vue-build/src/schema/tables/orderLine.ts')
    expect(schema).not.toContain('複製到')
    expect(schema).not.toContain('__')
    expect(schema).toContain('export interface OrderLineRow extends RowBase {\n  code: string | null\n  name: string | null\n}')
    expect(schema).toContain('tableLabel: \'訂單明細\'')
    expect(schema).toContain('newId: prefixedId(\'OL\')')
    expect(schema).toContain('{ key: \'code\', label: \'編號\', sheetHeader: \'OL-ID\', type: \'text\' },')
    expect(schema).not.toMatch(/'amount'|'date'|'status'|TPL/)
    expect(await read('vue-build/src/composables/actions/useOrderLineActions.ts')).toContain('export function useOrderLineActions')
    expect(await read('vue-build/mock/orderLine-test.csv')).toBe('OL-ID,名稱\n')
    expect(await read('vue-build/src/schema/index.ts')).toContain('import { orderLineSchema } from \'./tables/orderLine\'\n')
    expect(await read('vue-build/src/schema/index.ts')).toContain('  order: orderSchema,\n  orderLine: orderLineSchema,\n}')
    expect(await read('vue-build/src/composables/actions/index.ts')).toContain('import { useOrderLineActions } from \'./useOrderLineActions\'\n')
    expect(await read('vue-build/src/composables/actions/index.ts')).toContain('  order: useOrderActions,\n  orderLine: useOrderLineActions,\n}')
    expect(await read('vue-build/src/services/mock/tables.ts')).toContain('import orderLineCsv from \'../../../mock/orderLine-test.csv?raw\'\n')
    expect(await read('vue-build/src/services/mock/tables.ts')).toContain('  order: orderCsv,\n  orderLine: orderLineCsv,\n}')
    expect(result.config).toBe(false)
  })

  it('registers a real table in Config.gs with the primary key header', async () => {
    await put('apps-script/Config.gs', CONFIG)

    const result = await createTable(tools, { key: 'orderLine', label: '訂單明細', prefix: 'OL', virtual: false, sheetName: '明細' })
    await createTable(tools, { key: 'product', label: '商品', prefix: 'PRD', virtual: false, sheetName: ' ' })
    await createTable(tools, { key: 'ledger', label: '帳目', prefix: '', virtual: true, sheetName: '' })

    expect(result.config).toBe(true)
    expect(await read('apps-script/Config.gs')).toBe([
      'const TABLES = {',
      '  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },',
      '  orderLine: { sheetName: \'明細\', idColumn: \'OL-ID\' },',
      '  product: { sheetName: \'商品\', idColumn: \'PRD-ID\' },',
      '}',
      '',
    ].join('\n'))
  })

  it('creates a virtual table without a CSV and registers it at the end', async () => {
    const result = await createTable(tools, { key: 'ledger', label: '帳目', prefix: '', virtual: true, sheetName: '' })

    expect(result.created).toEqual([
      'vue-build/src/schema/tables/ledger.ts',
      'vue-build/src/composables/actions/useLedgerActions.ts',
    ])
    const schema = await read('vue-build/src/schema/tables/ledger.ts')
    expect(schema).not.toContain('複製到')
    expect(schema).not.toContain('__')
    expect(schema).toContain('export const ledgerSchema: VirtualTableSchema<LedgerRow> = {')
    expect(schema).toContain('export interface LedgerRow extends RowBase {\n  kind: string | null\n}')
    expect(schema).toContain('tableLabel: \'帳目\'')
    expect(schema).toContain('rules: [],')
    expect(schema).not.toMatch(/'amount'|'source'|doubled/)
    expect(await read('vue-build/src/composables/actions/useLedgerActions.ts')).toContain('export function useLedgerActions')
    expect(await read('vue-build/src/schema/index.ts')).toContain('  order: orderSchema,\n  ledger: ledgerSchema,\n}')
    expect(await read('vue-build/src/services/mock/tables.ts')).toBe(MOCK_TABLES)

    await createTable(tools, { key: 'line', label: '明細', prefix: 'LN', virtual: false, sheetName: '' })
    expect(await read('vue-build/src/schema/index.ts')).toContain('  order: orderSchema,\n  line: lineSchema,\n  ledger: ledgerSchema,\n}')
  })

  it('rejects a table key in use and writes nothing', async () => {
    await expect(createTable(tools, { key: 'order', label: '訂單', prefix: 'ORD', virtual: false, sheetName: '' })).rejects.toThrow('已有表 order。')
    await expect(createTable(tools, { key: 'Line', label: '明細', prefix: 'L', virtual: false, sheetName: '' })).rejects.toThrow('代號只能使用')
    await expect(createTable(tools, { key: 'line', label: '明細', prefix: 'l', virtual: false, sheetName: '' })).rejects.toThrow('主鍵字首只能使用')
    expect(await read('vue-build/src/schema/index.ts')).toBe(REGISTRY)
    expect(await read('vue-build/src/composables/actions/index.ts')).toBe(ACTIONS_REGISTRY)
  })
})

describe('deleteTable', () => {
  it('deletes the files, the empty folders and the registrations', async () => {
    await put('vue-build/src/composables/actions/useOrderActions.ts', '')
    await put('vue-build/src/pages/order/index.vue', '')
    await put('vue-build/src/pages/order/[id]/index.vue', '')
    await put('vue-build/src/pages/customer/[id]/order.vue', '')
    await put('vue-build/src/pages/customer/index.vue', '')

    const result = await deleteTable(tools, 'order')

    expect(result.deleted).toEqual([
      'vue-build/mock/order-test.csv',
      'vue-build/src/composables/actions/useOrderActions.ts',
      'vue-build/src/pages/customer/[id]/order.vue',
      'vue-build/src/pages/order/[id]/index.vue',
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/schema/tables/order.ts',
    ])
    expect(await readdir(path.join(root, 'vue-build/src/pages'))).toEqual(['customer'])
    expect(await readdir(path.join(root, 'vue-build/src/pages/customer'))).toEqual(['index.vue'])
    expect(await read('vue-build/src/schema/index.ts')).toBe('\nexport const schemas = {}\n')
    expect(await read('vue-build/src/composables/actions/index.ts')).toBe('import type { TableKey } from \'@/schema\'\n\nexport const tableActions = {} satisfies { [K in TableKey]?: (...args: never[]) => object }\n')
    expect(await read('vue-build/src/services/mock/tables.ts')).toBe('\nexport const mockCsv = {}\n')
    expect(result.config).toBe(false)
  })

  it('removes the Config.gs registration', async () => {
    await put('apps-script/Config.gs', CONFIG)

    const result = await deleteTable(tools, 'order')

    expect(result.config).toBe(true)
    expect(await read('apps-script/Config.gs')).toBe('const TABLES = {}\n')
  })

  it('removes the navigation items that link to the deleted pages, keeping the sections', async () => {
    await put('vue-build/src/pages/order/index.vue', '')
    await put('vue-build/src/pages/customer/index.vue', '')
    await put('vue-build/src/config/navigation.ts', [
      'import { mdiAccount, mdiCart } from \'@mdi/js\'',
      'export const navItems = [',
      '  { title: \'訂單\', icon: mdiCart, to: \'/order\' },',
      '  { title: \'客戶\', icon: mdiAccount, to: \'/customer\' },',
      ']',
      'export const drawerSections = [',
      '  {',
      '    title: \'其他\',',
      '    items: [',
      '      { title: \'訂單\', icon: mdiCart, to: \'/order\' },',
      '    ],',
      '  },',
      ']',
      '',
    ].join('\n'))

    await deleteTable(tools, 'order')

    expect(await read('vue-build/src/config/navigation.ts')).toBe([
      'import { mdiAccount } from \'@mdi/js\'',
      'export const navItems = [',
      '  { title: \'客戶\', icon: mdiAccount, to: \'/customer\' },',
      ']',
      'export const drawerSections = [',
      '  {',
      '    title: \'其他\',',
      '    items: [],',
      '  },',
      ']',
      '',
    ].join('\n'))
  })
})

describe('createMockCsv', () => {
  it('writes the header row and registers the CSV', async () => {
    await put('vue-build/src/schema/tables/customer.ts', 'export const customerSchema = { tableLabel: \'客戶\', columns: [{ key: \'code\', label: \'編號\', sheetHeader: \'CUS-ID\' }, { key: \'name\', label: \'名稱, 全名\' }] }\n')

    expect(await createMockCsv(tools, 'customer')).toEqual({ created: ['vue-build/mock/customer-test.csv'], config: false })
    expect(await read('vue-build/mock/customer-test.csv')).toBe('CUS-ID,"名稱, 全名"\n')
    expect(await read('vue-build/src/services/mock/tables.ts')).toContain('  order: orderCsv,\n  customer: customerCsv,\n}')
  })

  it('keeps an existing CSV', async () => {
    await expect(createMockCsv(tools, 'order')).rejects.toThrow('已有檔案')
  })
})

describe('tableDeletionFiles', () => {
  it('lists the files of a table only', () => {
    expect(tableDeletionFiles('order', [
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/pages/orderLine/index.vue',
      'vue-build/src/pages/customer/[id]/order.vue',
      'vue-build/src/pages/customer/[id]/orderLine.vue',
      'vue-build/src/schema/tables/order.ts',
      'vue-build/src/schema/tables/orderLine.ts',
    ], {})).toEqual([
      'vue-build/src/pages/customer/[id]/order.vue',
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/schema/tables/order.ts',
    ])
  })
})
