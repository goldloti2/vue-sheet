import type { TypeScript } from '../server/vueBuild'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { readTableSummaries, readTableSummary } from '../server/tableSummaries'
import { loadTypeScript } from '../server/vueBuild'
import { actionsTableKeyOf, pageFolderOf, tableKeyOf, tableKeyOfFile } from '../shared/tableKeys'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

describe('table keys', () => {
  it('reads the key from a schema file and an actions file', () => {
    expect(tableKeyOf('vue-build/src/schema/tables/orderLine.ts')).toBe('orderLine')
    expect(tableKeyOf('vue-build/src/schema/index.ts')).toBeNull()
    expect(actionsTableKeyOf('vue-build/src/composables/actions/useOrderLineActions.ts')).toBe('orderLine')
    expect(actionsTableKeyOf('vue-build/src/pages/order/index.vue')).toBeNull()
  })

  it('reads the page folder', () => {
    expect(pageFolderOf('vue-build/src/pages/order/[id]/index.vue')).toBe('order')
    expect(pageFolderOf('vue-build/src/pages/index.vue')).toBeNull()
  })

  it('finds the table of a schema, actions or page file', () => {
    const keys = new Set(['order'])

    expect(tableKeyOfFile('vue-build/src/schema/tables/order.ts', keys)).toBe('order')
    expect(tableKeyOfFile('vue-build/src/composables/actions/useOrderActions.ts', keys)).toBe('order')
    expect(tableKeyOfFile('vue-build/src/pages/order/index.vue', keys)).toBe('order')
    expect(tableKeyOfFile('vue-build/src/pages/dashboard/index.vue', keys)).toBeNull()
    expect(tableKeyOfFile('vue-build/src/config/navigation.ts', keys)).toBeNull()
  })
})

describe('table summaries', () => {
  let ts: TypeScript
  let root: string | null = null

  beforeAll(async () => {
    ts = await loadTypeScript(vueBuildRoot)
  }, 30_000)

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
      root = null
    }
  })

  it('reads the tableLabel written as a string', () => {
    expect(readTableSummary(ts, 'export const s = { tableLabel: \'訂單\', columns: [] }').label).toBe('訂單')
    expect(readTableSummary(ts, 'export const s = { tableLabel: `訂單` }').label).toBe('訂單')
    expect(readTableSummary(ts, 'export const s = { tableLabel: LABEL }').label).toBeNull()
  })

  it('reads the columns and their Sheet headers, real columns first', () => {
    const text = `export const s = {
      tableLabel: '訂單',
      virtualColumns: [{ key: 'total', label: '總額', type: 'number', value: row => 1 }],
      columns: [
        { key: 'name', label: '名稱', type: 'text' },
        { key: 'code', label: '編號', sheetHeader: 'ORD-ID', type: 'text' },
        { key: 'status', label: LABEL, type: 'select', options: ['a'] },
        COLUMN,
      ],
      formatRules: [{ columns: ['name'] }],
    }`

    expect(readTableSummary(ts, text).columns).toEqual([
      { key: 'name', label: '名稱', type: 'text', virtual: false, header: '名稱' },
      { key: 'code', label: '編號', type: 'text', virtual: false, header: 'ORD-ID' },
      { key: 'status', label: null, type: 'select', virtual: false, header: null },
      { key: 'total', label: '總額', type: 'number', virtual: true, header: null },
    ])
  })

  it('has no label and no columns without a schema object', () => {
    expect(readTableSummary(ts, 'export const s = { columns: [{ key: \'a\' }] }')).toEqual({ label: null, variable: null, columns: [] })
  })

  it('reads the table files only', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'editor-tables-'))
    await mkdir(path.join(root, 'vue-build/src/schema/tables'), { recursive: true })
    await writeFile(path.join(root, 'vue-build/src/schema/tables/order.ts'), 'export const s = { tableLabel: \'訂單\', columns: [{ key: \'a\' }] }')
    await writeFile(path.join(root, 'vue-build/src/schema/tables/draft.ts'), 'export const s = {}')
    await writeFile(path.join(root, 'vue-build/src/schema/index.ts'), 'export const s = { tableLabel: \'不列入\' }')

    expect(await readTableSummaries(ts, root, [
      'vue-build/src/schema/index.ts',
      'vue-build/src/schema/tables/draft.ts',
      'vue-build/src/schema/tables/order.ts',
    ])).toEqual({
      draft: { label: null, variable: null, columns: [] },
      order: { label: '訂單', variable: null, columns: [{ key: 'a', label: null, type: null, virtual: false, header: null }] },
    })
  })
})
