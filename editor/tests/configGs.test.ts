import type { TypeScript } from '../server/vueBuild'
import type { TableSummary } from '../shared/api'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyConfigEdits, parseConfig, readConfigTables } from '../server/configGs'
import { loadTypeScript } from '../server/vueBuild'
import { configRows, idColumnMismatch } from '../shared/configGs'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

let ts: TypeScript

beforeAll(async () => {
  ts = await loadTypeScript(vueBuildRoot)
}, 30_000)

const CONFIG = [
  '// 唯一須填寫的檔案',
  'const TABLES = {',
  '  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },',
  '  customer: { sheetName: SHEET, idColumn: \'CUS-ID\' },',
  '  line: LINE,',
  '}',
  '',
  'const HEADER_ROW = 1',
  '',
  'const LOCK_TIMEOUT_MS = 30 * 1000',
  '',
  'const AUTH = \'password\'',
  '',
].join('\n')

describe('parseConfig', () => {
  it('reads literal values and keeps other code as text', () => {
    expect(parseConfig(ts, CONFIG)).toEqual({
      tables: [
        { key: 'order', sheetName: { kind: 'value', value: '訂單' }, idColumn: { kind: 'value', value: 'ORD-ID' } },
        { key: 'customer', sheetName: { kind: 'code', text: 'SHEET' }, idColumn: { kind: 'value', value: 'CUS-ID' } },
        { key: 'line', sheetName: { kind: 'code', text: 'line: LINE' }, idColumn: { kind: 'code', text: 'line: LINE' } },
      ],
      headerRow: { kind: 'value', value: 1 },
      lockTimeout: { kind: 'value', value: 30 },
      auth: { kind: 'value', value: 'password' },
    })
  })

  it('reads the lock timeout in seconds from milliseconds, and other code as text', () => {
    expect(parseConfig(ts, 'const LOCK_TIMEOUT_MS = 15000').lockTimeout).toEqual({ kind: 'value', value: 15 })
    expect(parseConfig(ts, 'const LOCK_TIMEOUT_MS = 30 * 60').lockTimeout).toEqual({ kind: 'code', text: '30 * 60' })
  })

  it('reads a null AUTH as no login', () => {
    expect(parseConfig(ts, 'const AUTH = null').auth).toEqual({ kind: 'value', value: null })
  })

  it('has no tables and no settings when they are missing', () => {
    expect(parseConfig(ts, 'const OTHER = 1')).toEqual({ tables: null, headerRow: null, lockTimeout: null, auth: null })
  })
})

describe('readConfigTables', () => {
  it('maps each table to its literal values', () => {
    expect(readConfigTables(ts, CONFIG)).toEqual({
      order: { sheetName: '訂單', idColumn: 'ORD-ID' },
      customer: { sheetName: null, idColumn: 'CUS-ID' },
      line: { sheetName: null, idColumn: null },
    })
  })

  it('is null without a TABLES object', () => {
    expect(readConfigTables(ts, 'const TABLES = makeTables()')).toBeNull()
  })
})

describe('applyConfigEdits', () => {
  it('sets a table value, adding the property when it is missing', () => {
    const text = applyConfigEdits(ts, 'const TABLES = {\n  order: { sheetName: \'訂單\' },\n}\n', [
      { kind: 'setTable', key: 'order', name: 'sheetName', value: '訂單明細' },
      { kind: 'setTable', key: 'order', name: 'idColumn', value: 'ORD-ID' },
    ])

    expect(text).toBe('const TABLES = {\n  order: { sheetName: \'訂單明細\', idColumn: \'ORD-ID\' },\n}\n')
  })

  it('adds a table at the end, and leaves an existing table as it is', () => {
    const text = applyConfigEdits(ts, CONFIG, [
      { kind: 'addTable', key: 'product', sheetName: '商品', idColumn: 'PRD-ID' },
      { kind: 'addTable', key: 'order', sheetName: '其他', idColumn: 'X' },
    ])

    expect(text).toContain('  line: LINE,\n  product: { sheetName: \'商品\', idColumn: \'PRD-ID\' },\n}')
    expect(text).toContain('order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' }')
  })

  it('removes a table', () => {
    const text = applyConfigEdits(ts, CONFIG, [{ kind: 'removeTable', key: 'customer' }])

    expect(text).toContain('const TABLES = {\n  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },\n  line: LINE,\n}')
  })

  it('renames idColumn only when it is the old header', () => {
    const renamed = applyConfigEdits(ts, CONFIG, [{ kind: 'renameIdColumn', key: 'order', oldHeader: 'ORD-ID', header: '訂單編號' }])
    const other = applyConfigEdits(ts, CONFIG, [{ kind: 'renameIdColumn', key: 'order', oldHeader: '編號', header: '訂單編號' }])
    const missing = applyConfigEdits(ts, CONFIG, [{ kind: 'renameIdColumn', key: 'product', oldHeader: 'PRD-ID', header: '編號' }])

    expect(renamed).toContain('order: { sheetName: \'訂單\', idColumn: \'訂單編號\' }')
    expect(other).toBe(CONFIG)
    expect(missing).toBe(CONFIG)
  })

  it('sets the settings, writing the lock timeout as seconds times 1000', () => {
    const text = applyConfigEdits(ts, CONFIG, [
      { kind: 'setHeaderRow', value: 2 },
      { kind: 'setLockTimeout', seconds: 45 },
      { kind: 'setAuth', value: null },
    ])

    expect(text).toContain('const HEADER_ROW = 2\n')
    expect(text).toContain('const LOCK_TIMEOUT_MS = 45 * 1000\n')
    expect(text).toContain('const AUTH = null\n')
    expect(applyConfigEdits(ts, text, [{ kind: 'setAuth', value: 'password' }])).toContain('const AUTH = \'password\'\n')
  })

  it('throws when TABLES, a table or a setting is missing or written as code', () => {
    expect(() => applyConfigEdits(ts, 'const OTHER = 1', [{ kind: 'addTable', key: 'a', sheetName: 'A', idColumn: 'A-ID' }])).toThrow('TABLES')
    expect(() => applyConfigEdits(ts, CONFIG, [{ kind: 'setTable', key: 'product', name: 'sheetName', value: 'A' }])).toThrow('沒有 product')
    expect(() => applyConfigEdits(ts, CONFIG, [{ kind: 'setTable', key: 'line', name: 'sheetName', value: 'A' }])).toThrow('以程式碼寫成')
    expect(() => applyConfigEdits(ts, 'const TABLES = {}', [{ kind: 'setHeaderRow', value: 2 }])).toThrow('HEADER_ROW')
  })
})

function summary (label: string, virtual: boolean, idHeader: string | null): TableSummary {
  return {
    label,
    variable: null,
    virtual,
    idColumn: idHeader === null ? null : 'code',
    columns: idHeader === null ? [] : [{ key: 'code', label: '編號', type: 'text', virtual: false, header: idHeader, refTable: null }],
  }
}

describe('configRows', () => {
  const tables = {
    order: summary('訂單', false, 'ORD-ID'),
    customer: summary('客戶', false, 'CUS-ID'),
    draft: summary('草稿', false, null),
    report: summary('報表', true, null),
  }

  it('lists real tables in schemas order, then other real tables, then TABLES entries without a real table', () => {
    const model = parseConfig(ts, [
      'const TABLES = {',
      '  customer: { sheetName: \'客戶\', idColumn: \'客戶編號\' },',
      '  report: { sheetName: \'報表\', idColumn: \'R-ID\' },',
      '  [KEY]: {},',
      '}',
    ].join('\n'))
    const rows = configRows(model.tables!, { tables, tableOrder: ['customer', 'order', 'report'] })

    expect(rows.map(row => [row.key, row.label, row.table !== null, row.idHeader, row.orphan])).toEqual([
      ['customer', '客戶', true, 'CUS-ID', false],
      ['order', '訂單', false, 'ORD-ID', false],
      ['draft', '草稿', false, null, false],
      ['report', null, true, null, true],
      [null, null, true, null, true],
    ])
    expect(rows.map(row => idColumnMismatch(row))).toEqual([true, false, false, false, false])
  })
})
