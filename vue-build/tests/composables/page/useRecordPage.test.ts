import type { TableKey } from '@/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, provide } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

beforeEach(async () => {
  await freshBackend()
})

// 父表的詳細頁顯示 P-0001，其中的頁面位於 id 為 P-0002 的面板。回傳其中的頁面取得的 id 與列的 id
async function innerRecord (table: TableKey, { block }: { block: boolean }) {
  const { useRecordPage } = await import('@/composables/page/useRecordPage')
  const { provideChildBlock } = await import('@/composables/page/childBlock')
  const { dashboardPanelKey } = await import('@/composables/shell/useDashboardLinks')
  const store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(PARENTS)
  const panel = (id: string) => provide(dashboardPanelKey, { recordId: () => id } as never)

  const found: { id: string, row: string | undefined }[] = []
  const Inner = defineComponent(() => {
    const { id, row } = useRecordPage(table)
    found.push({ id: id.value, row: (row.value as { id: string } | null)?.id })
    return () => null
  })
  const Detail = defineComponent(() => {
    useRecordPage(PARENTS)
    panel('P-0002')
    if (block) {
      provideChildBlock({ title: '', limit: 5, emptyText: '' })
    }
    return () => h(Inner)
  })
  await renderToString(createSSRApp(defineComponent(() => {
    panel('P-0001')
    return () => h(Detail)
  })))
  return found[0]!
}

describe('useRecordPage', () => {
  it('子表區塊中，取用外層詳細頁的列', async () => {
    expect(await innerRecord(PARENTS, { block: true })).toEqual({ id: 'P-0001', row: 'P-0001' })
  })

  it('不在子表區塊中時，取用面板的輸入', async () => {
    expect(await innerRecord(PARENTS, { block: false })).toEqual({ id: 'P-0002', row: 'P-0002' })
  })

  it('外層的詳細頁為其他表時，不取用其 id', async () => {
    expect((await innerRecord(CHILDREN, { block: true })).id).toBe('P-0002')
  })
})
