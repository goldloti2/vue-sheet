import type { ParentRow } from '../../fixtures/backend/schema'
import type { ListPageOptions } from '@/composables/page/useListPage'
import type { SortSpec } from '@/schema/types'
import type { Component, Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { freshBackend } from '../../fixtures/backend/fresh'
import { PARENTS, schemas } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))

interface ListResult {
  rows: Readonly<Ref<readonly ParentRow[]>>
  sort: Ref<SortSpec | null>
}

beforeEach(async () => {
  await freshBackend()
  const store = (await import('@/stores/tables')).useTablesStore()
  await store.ensureLoaded(PARENTS)
})

// 一個以 useListPage 列出父表的元件，回傳的值存入 results
async function listOf (options: ListPageOptions<ParentRow>, results: ListResult[]): Promise<Component> {
  const { useListPage } = await import('@/composables/page/useListPage')
  return defineComponent(() => {
    const { rows, sort } = useListPage<ParentRow>(PARENTS, schemas.parents, options)
    results.push({ rows, sort })
    return () => null
  })
}

const idsOf = (result: ListResult) => result.rows.value.map(row => row.id)

// 父表的 defaultSort 為狀態（未開始、進行中、暫停、已完成），同狀態依 Sheet 的順序
const SCHEMA_ORDER = ['P-0003', 'P-0005', 'P-0004', 'P-0007', 'P-0001', 'P-0002', 'P-0006']

describe('頁面的 defaultSort', () => {
  it('沒有時依 schema 的 defaultSort', async () => {
    const results: ListResult[] = []
    await renderToString(createSSRApp(await listOf({}, results)))

    expect(idsOf(results[0]!)).toEqual(SCHEMA_ORDER)
  })

  it('排在 schema 的 defaultSort 之前，同值的列依 schema 的 defaultSort', async () => {
    const results: ListResult[] = []
    await renderToString(createSSRApp(await listOf({ defaultSort: [{ key: 'fee', direction: 'desc' }] }, results)))

    expect(idsOf(results[0]!)).toEqual(['P-0006', 'P-0003', 'P-0005', 'P-0004', 'P-0007', 'P-0001', 'P-0002'])
  })

  it('排序面板的排序排在頁面的 defaultSort 之前', async () => {
    const results: ListResult[] = []
    await renderToString(createSSRApp(await listOf({ defaultSort: [{ key: 'startDate', direction: 'desc' }] }, results)))
    results[0]!.sort.value = { key: 'source', direction: 'asc' }

    expect(idsOf(results[0]!)).toEqual(['P-0007', 'P-0005', 'P-0004', 'P-0003', 'P-0001', 'P-0002', 'P-0006'])
  })

  it('共用控制中，同一張表的列表各自依頁面的 defaultSort 排序', async () => {
    const { provideSharedListControls } = await import('@/composables/shell/useSharedListControls')
    const results: ListResult[] = []
    const withPageSort = await listOf({ defaultSort: [{ key: 'fee', direction: 'desc' }] }, results)
    const withoutPageSort = await listOf({}, results)
    const Container = defineComponent(() => {
      provideSharedListControls()
      return () => [h(withPageSort), h(withoutPageSort)]
    })
    await renderToString(createSSRApp(Container))

    expect(idsOf(results[0]!)).toEqual(['P-0006', 'P-0003', 'P-0005', 'P-0004', 'P-0007', 'P-0001', 'P-0002'])
    expect(idsOf(results[1]!)).toEqual(SCHEMA_ORDER)
    expect(results[0]!.sort).toBe(results[1]!.sort)
  })
})
