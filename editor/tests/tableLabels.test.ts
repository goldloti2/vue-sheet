import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { findTableLabel, readTableLabels, type TypeScript } from '../server/tableLabels'
import { loadTypeScript } from '../server/vueBuild'
import { actionsTableKeyOf, tableKeyOf } from '../shared/tableKeys'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

describe('table keys', () => {
  it('reads the key from a schema file and an actions file', () => {
    expect(tableKeyOf('vue-build/src/schema/tables/orderLine.ts')).toBe('orderLine')
    expect(tableKeyOf('vue-build/src/schema/index.ts')).toBeNull()
    expect(actionsTableKeyOf('vue-build/src/composables/actions/useOrderLineActions.ts')).toBe('orderLine')
    expect(actionsTableKeyOf('vue-build/src/pages/order/index.vue')).toBeNull()
  })
})

describe('table labels', () => {
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

  it('finds a tableLabel written as a string', () => {
    expect(findTableLabel(ts, 'export const s = { tableLabel: \'訂單\', columns: {} }')).toBe('訂單')
    expect(findTableLabel(ts, 'export const s = { tableLabel: `訂單` }')).toBe('訂單')
  })

  it('returns null for other forms', () => {
    expect(findTableLabel(ts, 'export const s = { tableLabel: LABEL }')).toBeNull()
    expect(findTableLabel(ts, 'export const s = { columns: {} }')).toBeNull()
  })

  it('reads the labels of the table files only', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'editor-labels-'))
    await mkdir(path.join(root, 'vue-build/src/schema/tables'), { recursive: true })
    await writeFile(path.join(root, 'vue-build/src/schema/tables/order.ts'), 'export const s = { tableLabel: \'訂單\' }')
    await writeFile(path.join(root, 'vue-build/src/schema/tables/draft.ts'), 'export const s = {}')
    await writeFile(path.join(root, 'vue-build/src/schema/index.ts'), 'export const s = { tableLabel: \'不列入\' }')

    expect(await readTableLabels(ts, root, [
      'vue-build/src/schema/index.ts',
      'vue-build/src/schema/tables/draft.ts',
      'vue-build/src/schema/tables/order.ts',
    ])).toEqual({ order: '訂單' })
  })
})
