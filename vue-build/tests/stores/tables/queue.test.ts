import type * as AppScript from '@/services/appScript'
import type * as Backend from '@/services/mock/backend'
import type { createQueue } from '@/stores/tables/queue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sheetRow } from '../../fixtures/backend/fresh'
import { CHILDREN, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let backend: typeof Backend
let appScript: typeof AppScript
let queue: ReturnType<typeof createQueue>

beforeEach(async () => {
  vi.resetModules()
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  backend = await import('@/services/mock/backend')
  appScript = await import('@/services/appScript')
  const { createQueue } = await import('@/stores/tables/queue')
  queue = createQueue()
  queue.knownModifiedTime.value = backend.mockList(PARENTS).modifiedTime
})

// 推送時實際送出的操作
async function sentOperations () {
  const spy = vi.spyOn(appScript, 'mutateBatch')
  await queue.flush()
  return spy.mock.calls[0]?.[0]
}

// 模擬別處寫入 Sheet：modifiedTime 改變
function writeElsewhere () {
  backend.mockBatch([{ table: PARENTS, kind: 'update', id: 'P-0002', values: { 備註: '別處' } }])
}

describe('enqueue 的合併', () => {
  it('修改後再修改，合併為一次修改，值取聯集', () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a', 方式: '自取' })
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'b' })
    expect(queue.kindOf(PARENTS, 'P-0001')).toBe('update')
    expect(sheetRow(backend, PARENTS, 'P-0001')).toMatchObject({ 備註: '', 方式: '郵寄' })
  })

  it('新增後再修改，仍為新增', () => {
    queue.enqueue(PARENTS, 'P-0100', 'create', { 狀態: '未開始' })
    queue.enqueue(PARENTS, 'P-0100', 'update', { 備註: 'a' })
    expect(queue.kindOf(PARENTS, 'P-0100')).toBe('create')
  })

  it('新增後再刪除，操作消失', () => {
    queue.enqueue(PARENTS, 'P-0100', 'create', { 狀態: '未開始' })
    queue.enqueue(PARENTS, 'P-0100', 'delete', {})
    expect(queue.kindOf(PARENTS, 'P-0100')).toBeUndefined()
    expect(queue.hasPending.value).toBe(false)
  })

  it('修改後再刪除，改為刪除', () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    queue.enqueue(PARENTS, 'P-0001', 'delete', {})
    expect(queue.kindOf(PARENTS, 'P-0001')).toBe('delete')
  })
})

describe('flush', () => {
  it('所有表的操作依加入的先後，以一個請求送出', async () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    queue.enqueue(CHILDREN, 'C-0001', 'update', { 備註: 'b' })
    queue.enqueue(PARENTS, 'P-0100', 'create', { 狀態: '未開始' })
    queue.enqueue(PARENTS, 'P-0001', 'update', { 方式: '自取' })
    queue.enqueue(CHILDREN, 'C-0002', 'delete', {})
    expect(await sentOperations()).toEqual([
      { table: PARENTS, kind: 'update', id: 'P-0001', values: { 備註: 'a', 方式: '自取' } },
      { table: PARENTS, kind: 'create', id: 'P-0100', values: { 狀態: '未開始' } },
      { table: CHILDREN, kind: 'update', id: 'C-0001', values: { 備註: 'b' } },
      { table: CHILDREN, kind: 'delete', id: 'C-0002' },
    ])
  })

  it('成功時清空佇列、更新 knownModifiedTime，並寫入後端', async () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    expect(await queue.flush()).toBe(true)
    expect(queue.hasPending.value).toBe(false)
    expect(queue.knownModifiedTime.value).toBe(backend.mockList(PARENTS).modifiedTime)
    expect(sheetRow(backend, PARENTS, 'P-0001')?.['備註']).toBe('a')
  })

  it('佇列為空時不送出請求', async () => {
    expect(await sentOperations()).toBeUndefined()
  })

  it('推送中再次呼叫時共用同一次推送', async () => {
    const spy = vi.spyOn(appScript, 'mutateBatch')
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    const first = queue.flush()
    expect(queue.flushing.value).toBe(true)
    const second = queue.flush()
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(queue.flushing.value).toBe(false)
  })

  it('衝突時回傳 false，設定 conflict，佇列保留', async () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    writeElsewhere()
    expect(await queue.flush()).toBe(false)
    expect(queue.conflict.value).toBe(true)
    expect(queue.flushError.value).toBeTruthy()
    expect(queue.kindOf(PARENTS, 'P-0001')).toBe('update')
    expect(sheetRow(backend, PARENTS, 'P-0001')?.['備註']).toBe('')
  })

  it('強制推送不帶 since，只覆蓋修改過的欄位', async () => {
    queue.enqueue(PARENTS, 'P-0002', 'update', { 方式: '郵寄' })
    writeElsewhere()
    await queue.flush()
    expect(await queue.flush(true)).toBe(true)
    expect(queue.conflict.value).toBe(false)
    expect(sheetRow(backend, PARENTS, 'P-0002')).toMatchObject({ 方式: '郵寄', 備註: '別處' })
  })

  it('後端出錯時佇列保留，後端整批不寫入', async () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    queue.enqueue(CHILDREN, 'C-9999', 'update', { 備註: 'b' })
    expect(await queue.flush()).toBe(false)
    expect(queue.conflict.value).toBe(false)
    expect(queue.flushError.value).toContain('C-9999')
    expect(queue.hasPending.value).toBe(true)
    expect(sheetRow(backend, PARENTS, 'P-0001')?.['備註']).toBe('')
  })

  it('下一次推送開始時清除上次的錯誤', async () => {
    queue.enqueue(CHILDREN, 'C-9999', 'update', { 備註: 'b' })
    await queue.flush()
    queue.enqueue(CHILDREN, 'C-9999', 'delete', {})
    queue.enqueue(CHILDREN, 'C-9999', 'create', { 名稱: '新的' })
    expect(await queue.flush()).toBe(true)
    expect(queue.flushError.value).toBeNull()
  })
})

describe('snapshot、restore、discard 與 fail', () => {
  it('restore 還原為 snapshot 時的佇列', () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    const saved = queue.snapshot(PARENTS)
    queue.enqueue(PARENTS, 'P-0001', 'delete', {})
    queue.enqueue(PARENTS, 'P-0100', 'create', { 狀態: '未開始' })
    queue.restore(PARENTS, saved)
    expect(queue.kindOf(PARENTS, 'P-0001')).toBe('update')
    expect(queue.kindOf(PARENTS, 'P-0100')).toBeUndefined()
  })

  it('discard 清空佇列與衝突', async () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    writeElsewhere()
    await queue.flush()
    queue.discard()
    expect(queue.hasPending.value).toBe(false)
    expect(queue.conflict.value).toBe(false)
    expect(queue.flushError.value).toBeNull()
  })

  it('fail 只記錄原因，不改變佇列', () => {
    queue.enqueue(PARENTS, 'P-0001', 'update', { 備註: 'a' })
    queue.fail('原因')
    expect(queue.flushError.value).toBe('原因')
    expect(queue.hasPending.value).toBe(true)
  })
})
