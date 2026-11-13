import type { TableKey } from '@/schema'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { PARENTS } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))

const { provideListOrder, siblingDirection, usePublishListOrder } = await import('@/composables/navigation/useListOrder')

// 以 provideListOrder 提供順序，回傳其中一列取得的發布函數
async function publisherUnder (table: TableKey | null, ids: string[]): Promise<() => void> {
  let publish: () => void = () => {}
  const Row = defineComponent(() => {
    publish = usePublishListOrder()
    return () => null
  })
  const List = defineComponent(() => {
    provideListOrder(table, ids)
    return () => h(Row)
  })
  await renderToString(createSSRApp(List))
  return publish
}

describe('provideListOrder', () => {
  it('點擊時才發布順序', async () => {
    const publish = await publisherUnder(PARENTS, ['P-0101', 'P-0102'])
    expect(siblingDirection('P-0101', 'P-0102')).toBeNull()
    publish()
    expect(siblingDirection('P-0101', 'P-0102')).toBe('forward')
  })

  it('表為 null 時不發布', async () => {
    const publish = await publisherUnder(null, ['P-0201', 'P-0202'])
    publish()
    expect(siblingDirection('P-0201', 'P-0202')).toBeNull()
  })
})
