import type { TableKey } from '@/schema'
import type * as Backend from '@/services/mock/backend'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeMessage } from '@/services/auth/tokenMessage'
import { sheetRow } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'custom' }))

let backend: typeof Backend

beforeEach(async () => {
  vi.resetModules()
  backend = await import('@/services/mock/backend')
})

function row (table: TableKey, id: string) {
  return sheetRow(backend, table, id)
}

describe('mockList', () => {
  it('回傳 CSV 中的每一列，值為原始字串', () => {
    const { rows } = backend.mockList(CHILDREN)
    expect(rows).toHaveLength(8)
    expect(rows[0]).toEqual({ 'C-ID': 'C-0001', 'P-ID': 'P-0001', '名稱': '物件一', '金額': '1608', '費用': '0', '日期': '2021/03/01', '備註': '' })
  })

  it('移除開頭的單引號', () => {
    expect(row(NOTES, 'N-0003')?.['內容']).toBe('001')
  })

  it('回傳複本，修改不影響假後端', () => {
    backend.mockList(PARENTS).rows[0]!['狀態'] = '暫停'
    expect(row(PARENTS, 'P-0001')?.['狀態']).toBe('已完成')
  })

  it('沒有 CSV 的表拋出錯誤', () => {
    expect(() => backend.mockList('missing' as string as TableKey)).toThrow('no mock data')
  })
})

describe('mockBatch', () => {
  it('新增、修改與刪除，修改只覆蓋傳入的欄位', () => {
    backend.mockBatch([
      { table: PARENTS, kind: 'create', id: 'P-0100', values: { 狀態: '未開始' } },
      { table: PARENTS, kind: 'update', id: 'P-0001', values: { 備註: '已修改' } },
      { table: CHILDREN, kind: 'delete', id: 'C-0008' },
    ])
    expect(row(PARENTS, 'P-0100')?.['狀態']).toBe('未開始')
    expect(row(PARENTS, 'P-0001')).toMatchObject({ 狀態: '已完成', 備註: '已修改' })
    expect(row(CHILDREN, 'C-0008')).toBeUndefined()
  })

  it('新增已存在的 id 時視為重送，不重複建立也不覆蓋', () => {
    backend.mockBatch([{ table: PARENTS, kind: 'create', id: 'P-0001', values: { 狀態: '暫停' } }])
    expect(backend.mockList(PARENTS).rows.filter(candidate => candidate['P-ID'] === 'P-0001')).toHaveLength(1)
    expect(row(PARENTS, 'P-0001')?.['狀態']).toBe('已完成')
  })

  it('任一個操作失敗時整批不寫入', () => {
    expect(() => backend.mockBatch([
      { table: PARENTS, kind: 'update', id: 'P-0001', values: { 備註: '已修改' } },
      { table: CHILDREN, kind: 'delete', id: 'C-0001' },
      { table: CHILDREN, kind: 'update', id: 'C-9999', values: { 名稱: '不存在' } },
    ])).toThrow('not found')
    expect(row(PARENTS, 'P-0001')?.['備註']).toBe('')
    expect(row(CHILDREN, 'C-0001')).toBeDefined()
  })

  it('since 與目前的 modifiedTime 不同時拋出 ConflictError，不寫入', () => {
    const { modifiedTime } = backend.mockList(PARENTS)
    const since = new Date(Date.parse(modifiedTime) - 1000).toISOString()
    expect(() => backend.mockBatch([{ table: PARENTS, kind: 'delete', id: 'P-0001' }], since)).toThrow(expect.objectContaining({ name: 'ConflictError' }))
    expect(row(PARENTS, 'P-0001')).toBeDefined()
  })

  it('since 相同時寫入，並回傳新的 modifiedTime', () => {
    vi.useFakeTimers({ now: Date.parse('2030-01-01T00:00:00Z') })
    try {
      const { modifiedTime } = backend.mockList(PARENTS)
      const next = backend.mockBatch([{ table: PARENTS, kind: 'delete', id: 'P-0001' }], modifiedTime)
      expect(next).toBe('2030-01-01T00:00:00.000Z')
      expect(backend.mockList(PARENTS).modifiedTime).toBe(next)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('mockLogin 與 mockAuthorize', () => {
  const DAY = 24 * 60 * 60

  it('任何憑證皆可登入，token 可通過驗證', () => {
    const { token } = backend.mockLogin({ username: '使用者' })
    expect(backend.mockAuthorize(token)).toBeUndefined()
  })

  it('沒有 token 或格式不符時拋出 unauthorized', () => {
    expect(() => backend.mockAuthorize(null)).toThrow(expect.objectContaining({ code: 'unauthorized' }))
    expect(() => backend.mockAuthorize('不是token')).toThrow(expect.objectContaining({ code: 'unauthorized' }))
  })

  it('過期時拋出 expired', () => {
    const token = encodeMessage({ user: '使用者', exp: Math.floor(Date.now() / 1000) - 1 })
    expect(() => backend.mockAuthorize(token)).toThrow(expect.objectContaining({ code: 'expired' }))
  })

  it('效期剩不到一半時回傳新的 token', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(backend.mockAuthorize(encodeMessage({ user: '使用者', exp: now + 20 * DAY }))).toBeUndefined()
    expect(backend.mockAuthorize(encodeMessage({ user: '使用者', exp: now + 10 * DAY }))).toEqual(expect.any(String))
  })
})
