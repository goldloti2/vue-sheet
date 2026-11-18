import type { KeyRenameTools } from '../../server/schema/renameKey'
import type { RenameLocation } from '../../shared/typescript'
import type { SchemaTestContext } from './setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { isProjectFile } from '../../server/projectFiles'
import { planKeyRename } from '../../server/schema/renameKey'
import { loadSchemaTestContext } from './setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

const SCHEMA = 'vue-build/src/schema/tables/order.ts'
const PAGE = 'vue-build/src/pages/order/index.vue'
const PAGE_TEXT = '<template>{{ row.date }}</template>\n'

// language service 以假的函數取代：Row 成員與頁面中的 date 各一處
function tools (locations: (text: string) => RenameLocation[]): KeyRenameTools {
  return {
    ts: context.ts,
    absolute: projectPath => `/repo/${projectPath}`,
    projectPath: absolute => isProjectFile(absolute.slice('/repo/'.length)) ? absolute.slice('/repo/'.length) : null,
    rename: async (_file, text) => locations(text),
    readFile: async projectPath => projectPath === PAGE ? { path: PAGE, text: PAGE_TEXT, hash: 'page-hash' } : null,
  }
}

function dateLocations (text: string): RenameLocation[] {
  const member = text.indexOf('date: Date')
  const use = PAGE_TEXT.indexOf('date')
  return [
    { file: `/repo/${SCHEMA}`, from: member, to: member + 4, text: 'orderedAt' },
    { file: `/repo/${PAGE}`, from: use, to: use + 4, text: 'orderedAt' },
  ]
}

describe('planKeyRename', () => {
  it('renames the Row member, the literals and the other files', async () => {
    const result = await planKeyRename(tools(dateLocations), { path: SCHEMA, text: context.template, oldKey: 'date', newKey: 'orderedAt', drafts: [] })

    expect(result.text).toContain('  orderedAt: Date | null\n')
    expect(result.text).toContain('{ key: \'orderedAt\', label: \'日期\', type: \'date\' },')
    expect(result.text).toContain('searchable: [\'name\', \'orderedAt\', \'amount\', \'status\'],')
    expect(result.others).toEqual([{
      path: PAGE,
      text: '<template>{{ row.orderedAt }}</template>\n',
      base: { path: PAGE, text: PAGE_TEXT, hash: 'page-hash' },
    }])
  })

  it('renames in the unsaved text of other files', async () => {
    const draft = `${PAGE_TEXT}`
    const result = await planKeyRename(tools(dateLocations), {
      path: SCHEMA,
      text: context.template,
      oldKey: 'date',
      newKey: 'orderedAt',
      drafts: [{ path: PAGE, text: draft }, { path: 'vue-build/src/pages/index.vue', text: '' }],
    })

    expect(result.others).toEqual([{ path: PAGE, text: '<template>{{ row.orderedAt }}</template>\n', base: null }])
  })

  it('rejects references outside the project files', async () => {
    const outside = () => [{ file: '/repo/vue-build/src/components/ui/Thing.vue', from: 0, to: 4, text: 'orderedAt' }]

    await expect(planKeyRename(tools(outside), { path: SCHEMA, text: context.template, oldKey: 'date', newKey: 'orderedAt', drafts: [] })).rejects.toThrow('不屬於專案的檔案')
  })

  it('rejects a missing column or a key in use', async () => {
    const request = { path: SCHEMA, text: context.template, drafts: [] }

    await expect(planKeyRename(tools(() => []), { ...request, oldKey: 'missing', newKey: 'other' })).rejects.toThrow('找不到欄位 missing。')
    await expect(planKeyRename(tools(() => []), { ...request, oldKey: 'date', newKey: 'amount' })).rejects.toThrow('已有欄位 amount。')
  })
})
