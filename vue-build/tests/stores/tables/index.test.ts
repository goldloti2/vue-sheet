import type { ChildRow, ParentRow } from '../../fixtures/backend/schema'
import type { TableKey } from '@/schema'
import type * as Backend from '@/services/mock/backend'
import type { useTablesStore } from '@/stores/tables'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { freshBackend, sheetRow } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let backend: typeof Backend
let store: ReturnType<typeof useTablesStore>

beforeEach(async () => {
  backend = await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
})

function ids (table: TableKey) {
  return (store.rows[table] as { id: string }[] | undefined)?.map(row => row.id)
}

function child (id: string) {
  return (store.rows[CHILDREN] as ChildRow[]).find(row => row.id === id)
}

// 模擬別處寫入 Sheet：modifiedTime 改變
function writeElsewhere () {
  backend.mockBatch([{ table: PARENTS, kind: 'update', id: 'P-0002', values: { 備註: '別處' } }])
}

describe('載入', () => {
  it('一併載入 ref 指向的父表與指向此表的子表', async () => {
    await store.ensureLoaded(CHILDREN)
    expect(new Set(Object.keys(store.rows))).toEqual(new Set([PARENTS, CHILDREN, NOTES]))
  })

  it('虛擬的 ref 欄位指向的表也一併載入', async () => {
    await store.ensureLoaded(NOTES)
    expect(store.rows[PARENTS]).toHaveLength(7)
  })

  it('值依 schema 轉型', async () => {
    await store.ensureLoaded(PARENTS)
    expect(child('C-0001')).toMatchObject({ id: 'C-0001', amount: 1608, day: new Date(2021, 2, 1) })
    expect(child('C-0007')?.day).toBeNull()
  })

  it('同時載入同一張表時只抓取一次', async () => {
    const appScript = await import('@/services/appScript')
    const spy = vi.spyOn(appScript, 'fetchTable')
    await Promise.all([store.ensureLoaded(PARENTS), store.ensureLoaded(PARENTS)])
    expect(spy.mock.calls.filter(([table]) => table === PARENTS)).toHaveLength(1)
  })

  it('preloadAll 載入所有的表，載入中的表不重複抓取', async () => {
    const appScript = await import('@/services/appScript')
    const spy = vi.spyOn(appScript, 'fetchTable')
    await Promise.all([store.ensureLoaded(PARENTS), store.preloadAll()])
    expect(new Set(Object.keys(store.rows))).toEqual(new Set([PARENTS, CHILDREN, NOTES]))
    expect(spy.mock.calls.map(([table]) => table)).toHaveLength(3)
    expect(new Set(spy.mock.calls.map(([table]) => table))).toEqual(new Set([PARENTS, CHILDREN, NOTES]))
  })

  it('載入失敗時記錄錯誤，reload 時重新抓取', async () => {
    const appScript = await import('@/services/appScript')
    vi.spyOn(appScript, 'fetchTable').mockRejectedValueOnce(new Error('失敗'))
    await store.ensureLoaded(NOTES)
    expect(store.error[NOTES]).toBe('失敗')
    expect(store.rows[NOTES]).toBeUndefined()
    await store.reload()
    expect(store.error[NOTES]).toBeNull()
    expect(store.rows[NOTES]).toHaveLength(3)
  })

  it('第一次載入時 loading 為真', async () => {
    const loading = store.ensureLoaded(NOTES)
    expect(store.loading[NOTES]).toBe(true)
    await loading
    expect(store.loading[NOTES]).toBe(false)
  })

  it('已有資料的表重新抓取時 loading 維持為否，原本的列保留至抓取完成', async () => {
    await store.ensureLoaded(NOTES)
    const before = store.rows[NOTES]
    const reloading = store.reload()
    expect(store.loading[NOTES]).toBe(false)
    expect(store.rows[NOTES]).toBe(before)
    await reloading
    expect(store.loading[NOTES]).toBe(false)
    expect(store.rows[NOTES]).not.toBe(before)
  })
})

describe('create', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
  })

  it('主鍵為空時以 newId 產生，並填回主鍵', () => {
    const created = store.create<ParentRow>(PARENTS, { status: '未開始' })
    expect(created.id).toMatch(/^P-[\da-f]{8}$/)
    expect(created.code).toBe(created.id)
    expect(ids(PARENTS)).toContain(created.id)
  })

  it('沒有 newId 的表，主鍵為必填', () => {
    expect(() => store.create(NOTES, { content: '內容' })).toThrow('請填寫N-ID')
  })

  it('主鍵重複時拋出錯誤，不修改快取', () => {
    expect(() => store.create(PARENTS, { code: 'P-0001', status: '未開始' })).toThrow('P-ID「P-0001」已存在')
    expect(store.rows[PARENTS]).toHaveLength(7)
  })

  it('剛被刪除、尚未推送的 id 不能再使用', () => {
    store.remove(NOTES, 'N-0001')
    expect(() => store.create(NOTES, { code: 'N-0001', content: '內容' })).toThrow('剛被刪除')
  })

  it('驗證失敗時拋出錯誤，不加入佇列', async () => {
    expect(() => store.create(CHILDREN, { parent: 'P-0001', name: '', amount: -1 })).toThrow('請填寫名稱、金額不能小於 0')
    expect(store.hasPending).toBe(false)
  })

  it('推送後，後端的值為 Sheet 上的字串', async () => {
    store.create(CHILDREN, { code: 'C-0100', parent: 'P-0001', name: '0123', amount: 5, day: new Date(2022, 0, 2) })
    await store.flush()
    expect(sheetRow(backend, CHILDREN, 'C-0100')).toMatchObject({ 'P-ID': 'P-0001', '名稱': '0123', '金額': '5', '日期': '2022/01/02' })
  })
})

describe('update', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
  })

  it('主鍵不能修改', () => {
    expect(() => store.update(CHILDREN, 'C-0001', { code: 'C-0100' })).toThrow('C-ID建立後不能修改')
  })

  it('只驗證傳入的欄位，但以合併後的整列驗證', () => {
    expect(() => store.update(CHILDREN, 'C-0001', { fee: 2000 })).toThrow('費用不能大於金額')
    expect(() => store.update(CHILDREN, 'C-0001', { fee: 2000, amount: 3000 })).not.toThrow()
  })

  it('回傳新的列，快取中的舊列不變', () => {
    const before = child('C-0001')!
    const updated = store.update<ChildRow>(CHILDREN, 'C-0001', { note: '新' })
    expect(updated.note).toBe('新')
    expect(before.note).toBeNull()
    expect(child('C-0001')).toBe(updated)
  })

  it('只推送修改的欄位', async () => {
    const appScript = await import('@/services/appScript')
    const spy = vi.spyOn(appScript, 'mutateBatch')
    store.update(CHILDREN, 'C-0001', { note: '新' })
    await store.flush()
    expect(spy.mock.calls[0]?.[0]).toEqual([{ table: CHILDREN, kind: 'update', id: 'C-0001', values: { 備註: '新' } }])
  })

  it('ref 改指其他父列後，原父列沒有子列時刪除（onEmpty）', () => {
    store.update(CHILDREN, 'C-0001', { parent: 'P-0002' })
    expect(ids(PARENTS)).not.toContain('P-0001')
    store.update(CHILDREN, 'C-0006', { parent: 'P-0002' })
    expect(ids(PARENTS)).toContain('P-0006')
  })
})

describe('remove', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
  })

  it('沿 cascade 的關聯遞迴刪除子列', () => {
    store.remove(PARENTS, 'P-0006')
    expect(ids(CHILDREN)).not.toContain('C-0006')
    expect(ids(CHILDREN)).not.toContain('C-0007')
    expect(ids(NOTES)).toEqual(['N-0001'])
  })

  it('沒有 cascade 的關聯不刪除子列', () => {
    store.remove(CHILDREN, 'C-0001')
    expect(ids(NOTES)).toEqual(['N-0002', 'N-0003'])
  })

  it('父列的最後一個子列被刪除時，刪除父列（onEmpty）', () => {
    store.remove(CHILDREN, 'C-0006')
    expect(ids(PARENTS)).toContain('P-0006')
    store.remove(CHILDREN, 'C-0007')
    expect(ids(PARENTS)).not.toContain('P-0006')
  })

  it('連帶刪除的列也送到後端', async () => {
    store.remove(CHILDREN, 'C-0001')
    await store.flush()
    expect(sheetRow(backend, CHILDREN, 'C-0001')).toBeUndefined()
    expect(sheetRow(backend, PARENTS, 'P-0001')).toBeUndefined()
    expect(sheetRow(backend, NOTES, 'N-0001')).toBeUndefined()
  })
})

describe('流程', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
  })

  it('rollbackFlow 還原流程中改動的快取與佇列', () => {
    store.update(CHILDREN, 'C-0002', { note: '流程前' })
    const before = store.rows[CHILDREN]
    store.beginFlow()
    store.update(CHILDREN, 'C-0002', { note: '流程中' })
    store.remove(PARENTS, 'P-0006')
    store.rollbackFlow()
    expect(store.rows[CHILDREN]).toBe(before)
    expect(store.rows[PARENTS]).toHaveLength(7)
    expect(child('C-0002')?.note).toBe('流程前')
  })

  it('rollbackFlow 後只推送流程前的變更', async () => {
    store.update(CHILDREN, 'C-0002', { note: '流程前' })
    store.beginFlow()
    store.update(CHILDREN, 'C-0002', { note: '流程中' })
    store.create(NOTES, { code: 'N-0100', content: '內容' })
    store.rollbackFlow()
    await store.flush()
    expect(sheetRow(backend, CHILDREN, 'C-0002')?.['備註']).toBe('流程前')
    expect(sheetRow(backend, NOTES, 'N-0100')).toBeUndefined()
  })

  it('commitFlow 保留變更', () => {
    store.beginFlow()
    store.update(CHILDREN, 'C-0002', { note: '流程中' })
    store.commitFlow()
    expect(child('C-0002')?.note).toBe('流程中')
    expect(store.hasPending).toBe(true)
  })

  it('同時只能有一個流程', () => {
    store.beginFlow()
    expect(() => store.beginFlow()).toThrow('上一個流程還沒結束')
  })

  it('流程進行中不能推送', async () => {
    store.beginFlow()
    store.update(CHILDREN, 'C-0002', { note: '流程中' })
    expect(store.canSync).toBe(false)
    expect(await store.flush()).toBe(false)
    expect(store.flushError).toBe('流程進行中，無法推送')
  })
})

describe('同步', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
  })

  it('holdSync 持有時不能同步，重複釋放只計一次', () => {
    const release = store.holdSync()
    const other = store.holdSync()
    expect(store.canSync).toBe(false)
    release()
    release()
    expect(store.canSync).toBe(false)
    other()
    expect(store.canSync).toBe(true)
  })

  it('refresh 推送後重新抓取', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    const before = child('C-0002')
    expect(await store.refresh()).toBe(true)
    expect(child('C-0002')).not.toBe(before)
    expect(child('C-0002')?.note).toBe('新')
  })

  it('推送期間的修改：重新抓取後蓋回快取，其他欄位為 Sheet 的值', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    const refreshing = store.refresh()
    backend.mockBatch([{ table: CHILDREN, kind: 'update', id: 'C-0003', values: { 名稱: '別處' } }])
    store.update(CHILDREN, 'C-0003', { note: '推送中' })
    expect(await refreshing).toBe(true)
    expect(child('C-0003')).toMatchObject({ name: '別處', note: '推送中' })
    expect(child('C-0002')?.note).toBe('新')
    expect(store.hasPending).toBe(true)
  })

  it('推送期間的新增與刪除：重新抓取後蓋回快取', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    const refreshing = store.refresh()
    store.create(CHILDREN, { code: 'C-0100', parent: 'P-0001', name: '新的', day: new Date(2022, 0, 2) })
    store.remove(CHILDREN, 'C-0003')
    await refreshing
    expect(child('C-0100')).toMatchObject({ name: '新的', day: new Date(2022, 0, 2) })
    expect(child('C-0003')).toBeUndefined()
  })

  it('重新抓取期間的修改：抓取完成後蓋回快取', async () => {
    const reloading = store.reload()
    store.update(CHILDREN, 'C-0003', { note: '抓取中' })
    await reloading
    expect(child('C-0003')?.note).toBe('抓取中')
  })

  it('不可同步時抓取完成的結果，恢復可同步時才套用', async () => {
    const before = store.rows[CHILDREN]
    const reloading = store.reload()
    const release = store.holdSync()
    await reloading
    expect(store.rows[CHILDREN]).toBe(before)
    store.update(CHILDREN, 'C-0003', { note: '表單' })
    release()
    await nextTick()
    expect(store.rows[CHILDREN]).not.toBe(before)
    expect(child('C-0003')?.note).toBe('表單')
  })

  it('同步被持有時 refresh 不推送', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    store.holdSync()
    expect(await store.refresh()).toBe(false)
    expect(store.hasPending).toBe(true)
  })

  it('衝突時 refresh 失敗，discardAndReload 以 Sheet 的內容為準', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    writeElsewhere()
    expect(await store.refresh()).toBe(false)
    expect(store.conflict).toBe(true)
    await store.discardAndReload()
    expect(store.hasPending).toBe(false)
    expect(child('C-0002')?.note).toBeNull()
    expect((store.rows[PARENTS] as ParentRow[]).find(row => row.id === 'P-0002')?.note).toBe('別處')
  })

  it('衝突時 forcePush 只覆蓋修改過的欄位', async () => {
    store.update(PARENTS, 'P-0002', { method: '郵寄' })
    writeElsewhere()
    await store.refresh()
    expect(await store.forcePush()).toBe(true)
    expect(sheetRow(backend, PARENTS, 'P-0002')).toMatchObject({ 方式: '郵寄', 備註: '別處' })
  })
})

describe('衝突比對的時間', () => {
  beforeEach(async () => {
    await store.ensureLoaded(NOTES)
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // 其中一張表重新抓取失敗，該表仍為別處寫入之前的資料
  async function reloadWithOneFailure () {
    const appScript = await import('@/services/appScript')
    vi.spyOn(appScript, 'fetchTable').mockRejectedValueOnce(new Error('失敗'))
    await store.reload()
  }

  it('各表的時間不同時，以最舊的時間比對，別處的寫入判定為衝突', async () => {
    vi.setSystemTime(new Date(2099, 0, 1))
    writeElsewhere()
    await reloadWithOneFailure()
    store.update(CHILDREN, 'C-0002', { note: '新' })
    expect(await store.flush()).toBe(false)
    expect(store.conflict).toBe(true)
  })

  it('推送成功後，各表的時間皆為推送後的時間', async () => {
    store.update(CHILDREN, 'C-0002', { note: '新' })
    vi.setSystemTime(new Date(2099, 0, 1))
    expect(await store.flush()).toBe(true)
    await reloadWithOneFailure()
    store.update(CHILDREN, 'C-0003', { note: '再改' })
    expect(await store.flush()).toBe(true)
  })
})
