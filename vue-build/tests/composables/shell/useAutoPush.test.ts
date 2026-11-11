import type { useTablesStore } from '@/stores/tables'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let store: ReturnType<typeof useTablesStore>
let push: ReturnType<typeof vi.fn<() => Promise<void>>>

beforeEach(async () => {
  await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(NOTES)
  push = vi.fn(async () => {})
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function start (delay: number | null) {
  const { useAutoPush } = await import('@/composables/shell/useAutoPush')
  const scope = effectScope()
  scope.run(() => useAutoPush(delay, push))
  return scope
}

async function edit (note: string) {
  store.update(CHILDREN, 'C-0002', { note })
  await nextTick()
}

describe('useAutoPush', () => {
  it('最後一次修改後經過 delay 秒才推送，期間再次修改則重新計時', async () => {
    await start(30)
    await edit('一')
    vi.advanceTimersByTime(20_000)
    await edit('二')
    vi.advanceTimersByTime(20_000)
    expect(push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('同步被持有時不推送，釋放後重新計時', async () => {
    await start(30)
    const release = store.holdSync()
    await edit('一')
    vi.advanceTimersByTime(60_000)
    expect(push).not.toHaveBeenCalled()
    release()
    await nextTick()
    vi.advanceTimersByTime(30_000)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('推送失敗後不重試，等到下一次修改', async () => {
    await start(30)
    await edit('一')
    vi.advanceTimersByTime(30_000)
    vi.advanceTimersByTime(60_000)
    expect(push).toHaveBeenCalledTimes(1)
    await edit('二')
    vi.advanceTimersByTime(30_000)
    expect(push).toHaveBeenCalledTimes(2)
  })

  it('delay 為 null 時不啟用', async () => {
    await start(null)
    await edit('一')
    vi.advanceTimersByTime(3_600_000)
    expect(push).not.toHaveBeenCalled()
  })

  it('scope 結束後不推送', async () => {
    const scope = await start(30)
    await edit('一')
    scope.stop()
    vi.advanceTimersByTime(30_000)
    expect(push).not.toHaveBeenCalled()
  })
})
