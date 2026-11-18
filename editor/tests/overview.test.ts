import { describe, expect, it } from 'vitest'
import { overviewRows } from '../shared/overview'

describe('overviewRows', () => {
  it('lists the registered tables in order, then the other tables', () => {
    const rows = overviewRows({ entries: [{ key: 'order', variable: 'orderSchema' }, { key: null, variable: null }] }, {
      paths: [
        'vue-build/src/composables/actions/useOrderActions.ts',
        'vue-build/src/pages/order/[id]/index.vue',
        'vue-build/src/pages/order/index.vue',
        'vue-build/src/pages/draft/[id]/index.vue',
        'vue-build/src/schema/tables/draft.ts',
        'vue-build/src/schema/tables/order.ts',
      ],
      tables: {
        order: { label: '訂單', variable: 'orderSchema', columns: [] },
        draft: { label: null, variable: 'draftSchema', columns: [] },
      },
      mockCsv: { order: 'vue-build/mock/order-test.csv' },
    })

    expect(rows).toEqual([
      {
        key: 'order',
        index: 0,
        variable: 'orderSchema',
        label: '訂單',
        files: {
          schema: 'vue-build/src/schema/tables/order.ts',
          actions: 'vue-build/src/composables/actions/useOrderActions.ts',
          pages: 'vue-build/src/pages/order/index.vue',
          csv: 'vue-build/mock/order-test.csv',
        },
      },
      { key: null, index: 1, variable: null, label: null, files: { schema: null, actions: null, pages: null, csv: null } },
      {
        key: 'draft',
        index: null,
        variable: 'draftSchema',
        label: null,
        files: { schema: 'vue-build/src/schema/tables/draft.ts', actions: null, pages: 'vue-build/src/pages/draft/[id]/index.vue', csv: null },
      },
    ])
  })

  it('opens the detail page before other pages when there is no list page', () => {
    const [row] = overviewRows({ entries: [{ key: 'order', variable: 'orderSchema' }] }, {
      paths: ['vue-build/src/pages/order/[id]/customer.vue', 'vue-build/src/pages/order/[id]/index.vue', 'vue-build/src/pages/order/_ref/A.vue'],
      tables: {},
      mockCsv: {},
    })

    expect(row!.files.pages).toBe('vue-build/src/pages/order/[id]/index.vue')
  })

  it('opens the first page when there is no list or detail page', () => {
    const [row] = overviewRows({ entries: [{ key: 'order', variable: 'orderSchema' }] }, {
      paths: ['vue-build/src/pages/order/_ref/B.vue', 'vue-build/src/pages/order/[id]/customer.vue'],
      tables: {},
      mockCsv: {},
    })

    expect(row!.files.pages).toBe('vue-build/src/pages/order/[id]/customer.vue')
  })
})
