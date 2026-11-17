import type { HmrContext, Plugin } from 'vite'
import { describe, expect, it } from 'vitest'
import { previewDrafts } from '../server/previewDrafts'

const FILE = '/repo/vue-build/src/schema/tables/order.ts'

// 外掛的 hook 不使用 this，直接呼叫
function hooks (plugin: Plugin) {
  const load = plugin.load as (id: string) => string | null
  const handleHotUpdate = plugin.handleHotUpdate as (ctx: HmrContext) => void
  return { load, handleHotUpdate }
}

describe('previewDrafts', () => {
  const { load, handleHotUpdate } = hooks(previewDrafts(new Map([[FILE, 'draft']])))

  it('serves the draft for the file and for ?raw', () => {
    expect(load(FILE)).toBe('draft')
    expect(load(`${FILE}?raw`)).toBe('export default "draft"')
  })

  it('leaves files without drafts and other queries to the other plugins', () => {
    expect(load('/repo/vue-build/src/main.ts')).toBeNull()
    expect(load(`${FILE}?vue&type=style&index=0`)).toBeNull()
  })

  it('makes the hot update read the draft', async () => {
    const ctx = { file: FILE, read: () => 'disk' } as unknown as HmrContext
    handleHotUpdate(ctx)
    expect(await ctx.read()).toBe('draft')
  })
})
