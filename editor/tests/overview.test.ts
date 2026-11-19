import { describe, expect, it } from 'vitest'
import { mockOverviewRows, overviewRows } from '../shared/overview'
import { tableOfCsv } from '../shared/tableFiles'

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

describe('mockOverviewRows', () => {
  it('lists the tables in order, then the CSV files without a table', () => {
    const rows = mockOverviewRows({ csv: { order: 'vue-build/mock/order-test.csv', ghost: 'vue-build/mock/ghost.csv' } }, {
      paths: ['vue-build/mock/customer-test.csv', 'vue-build/mock/extra.csv', 'vue-build/mock/order-test.csv'],
      tables: {
        customer: { label: '客戶', variable: null, columns: [] },
        draft: { label: null, variable: null, columns: [] },
        order: { label: '訂單', variable: null, columns: [] },
      },
      tableOrder: ['order', 'customer'],
      csvRows: { 'vue-build/mock/order-test.csv': 3, 'vue-build/mock/customer-test.csv': 0, 'vue-build/mock/extra.csv': 1 },
    })

    expect(rows).toEqual([
      { key: 'order', label: '訂單', registered: true, csv: 'vue-build/mock/order-test.csv', rows: 3 },
      { key: 'customer', label: '客戶', registered: false, csv: 'vue-build/mock/customer-test.csv', rows: 0 },
      { key: 'draft', label: null, registered: false, csv: null, rows: null },
      { key: 'ghost', label: null, registered: true, csv: 'vue-build/mock/ghost.csv', rows: null },
      { key: null, label: null, registered: false, csv: 'vue-build/mock/extra.csv', rows: 1 },
    ])
  })
})

describe('tableOfCsv', () => {
  it('finds the table that registers the CSV, then by the file name', () => {
    const mockCsv = { order: 'vue-build/mock/orders.csv' }

    expect(tableOfCsv('vue-build/mock/orders.csv', mockCsv, ['order'])).toBe('order')
    expect(tableOfCsv('vue-build/mock/customer-test.csv', mockCsv, ['order', 'customer'])).toBe('customer')
    expect(tableOfCsv('vue-build/mock/extra.csv', mockCsv, ['order'])).toBeNull()
  })
})
