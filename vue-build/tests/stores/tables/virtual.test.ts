import type { ChildRow, ParentRow } from '../../fixtures/backend/schema'
import type { LedgerRow } from '../../fixtures/backend/virtualSchema'
import type { RealTableKey } from '@/schema'
import type { useTablesStore } from '@/stores/tables'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, LEDGER, PARENTS } from '../../fixtures/backend/virtualSchema'

vi.mock('@/schema', () => import('../../fixtures/backend/virtualSchema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

let store: ReturnType<typeof useTablesStore>

beforeEach(async () => {
  await freshBackend()
  store = (await import('@/stores/tables')).useTablesStore()
})

function ledger (): LedgerRow[] {
  return store.rows[LEDGER] as LedgerRow[]
}

function entry (id: string): LedgerRow | undefined {
  return ledger().find(row => row.id === id)
}

function parent (id: string): ParentRow {
  return (store.rows[PARENTS] as ParentRow[]).find(row => row.id === id)!
}

function child (id: string): ChildRow {
  return (store.rows[CHILDREN] as ChildRow[]).find(row => row.id === id)!
}

describe('產生列', () => {
  it('來源表載入後依規則產生列，原始順序依 columns 逐欄升冪', async () => {
    await store.ensureLoaded(LEDGER)
    expect(ledger().map(row => row.id)).toEqual(['C-0008-1', 'C-0003-1', 'C-0004-1', 'C-0005-1', 'C-0004-2', 'C-0005-2', 'P-0006-3'])
  })

  it('同一列符合兩條規則時各產生一列，規則沒有指定的欄位為 null', async () => {
    await store.ensureLoaded(LEDGER)
    expect(entry('C-0004-1')).toMatchObject({ kind: '金額', amount: 5010, parent: 'P-0004', child: 'C-0004' })
    expect(entry('C-0004-2')).toMatchObject({ kind: '大額', amount: 5010, day: new Date(2021, 9, 1) })
    expect(entry('P-0006-3')).toMatchObject({ kind: '父表費用', amount: 976, parent: 'P-0006', child: null, day: null })
  })

  it('列上有虛擬欄位、$label 與父列的 getter', async () => {
    await store.ensureLoaded(LEDGER)
    const row = entry('C-0004-2')!
    expect(row.doubled).toBe(10_020)
    expect(row.$label).toBe('大額')
    expect(row.$parent).toBe(parent('P-0004'))
    expect(row.$child).toBe(child('C-0004'))
  })

  it('真實表的列有指向它的虛擬表的列', async () => {
    await store.ensureLoaded(PARENTS)
    const rows = (parent('P-0004') as unknown as { $ledger_parent: LedgerRow[] }).$ledger_parent
    expect(rows.map(row => row.id)).toEqual(['C-0004-1', 'C-0004-2'])
  })

  it('載入父表時一併產生虛擬表', async () => {
    await store.ensureLoaded(PARENTS)
    expect(ledger()).toHaveLength(7)
  })
})

describe('重算', () => {
  beforeEach(async () => {
    await store.ensureLoaded(LEDGER)
  })

  it('修改來源表後立即重算', () => {
    store.update(CHILDREN, 'C-0003', { amount: 6000 })
    expect(entry('C-0003-2')?.amount).toBe(6000)
  })

  it('規則經由 getter 讀取的另一張表修改後也重算', () => {
    store.update(PARENTS, 'P-0003', { status: '已完成' })
    expect(entry('C-0003-1')).toBeUndefined()
    store.update(PARENTS, 'P-0004', { startDate: new Date(2022, 0, 1) })
    expect(entry('C-0004-2')?.day).toEqual(new Date(2022, 0, 1))
  })

  it('刪除來源列時對應的列消失，推送不含虛擬表', async () => {
    store.remove(CHILDREN, 'C-0008')
    expect(entry('C-0008-1')).toBeUndefined()
    expect(await store.flush()).toBe(true)
  })
})

describe('唯讀', () => {
  beforeEach(async () => {
    await store.ensureLoaded(LEDGER)
  })

  it('寫入虛擬表時拋出錯誤，不修改快取', () => {
    const table = LEDGER as RealTableKey
    expect(() => store.create(table, { kind: '金額' })).toThrow('「帳目」為虛擬表，無法寫入')
    expect(() => store.update(table, 'C-0003-1', { amount: 1 })).toThrow('為虛擬表')
    expect(() => store.remove(table, 'C-0003-1')).toThrow('為虛擬表')
    expect(ledger()).toHaveLength(7)
  })

  it('不抓取虛擬表', async () => {
    const appScript = await import('@/services/appScript')
    const spy = vi.spyOn(appScript, 'fetchTable')
    await store.reload()
    expect(spy.mock.calls.map(([table]) => table)).not.toContain(LEDGER)
    expect(ledger()).toHaveLength(7)
  })
})

describe('載入中與錯誤', () => {
  it('來源表載入中時為載入中', async () => {
    const loading = store.ensureLoaded(LEDGER)
    expect(store.loading[LEDGER]).toBe(true)
    await loading
    expect(store.loading[LEDGER]).toBe(false)
  })

  it('來源表載入失敗時為失敗，訊息寫出來源表', async () => {
    const appScript = await import('@/services/appScript')
    const original = appScript.fetchTable
    vi.spyOn(appScript, 'fetchTable').mockImplementation(table => table === CHILDREN ? Promise.reject(new Error('失敗')) : original(table))
    await store.ensureLoaded(LEDGER)
    expect(store.error[LEDGER]).toBe('來源表「子表」：失敗')
    expect(store.rows[LEDGER]).toBeUndefined()
  })
})
