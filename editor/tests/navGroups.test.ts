import { describe, expect, it } from 'vitest'
import { navGroups } from '../shared/navGroups'

describe('navGroups', () => {
  it('groups the files by kind', () => {
    const groups = navGroups([
      'apps-script/Config.gs',
      'vue-build/mock/order-test.csv',
      'vue-build/src/composables/actions/useOrderActions.ts',
      'vue-build/src/config/navigation.ts',
      'vue-build/src/pages/dashboard.vue',
      'vue-build/src/schema/index.ts',
      'vue-build/src/schema/tables/order.ts',
      'vue-build/src/services/mock/tables.ts',
    ])

    expect(groups.map(group => group.label)).toEqual(['表', '動作', '頁面', '導覽', '後端', '資料'])
    expect(groups[0]!.children).toEqual([
      { label: '總覽', path: 'vue-build/src/schema/index.ts' },
      { label: 'order', path: 'vue-build/src/schema/tables/order.ts' },
    ])
    expect(groups[1]!.children).toEqual([
      { label: 'order', path: 'vue-build/src/composables/actions/useOrderActions.ts' },
    ])
    expect(groups[5]!.children!.map(node => node.label)).toEqual(['tables', 'order-test.csv'])
  })

  it('makes a single-file group the file itself', () => {
    expect(navGroups(['vue-build/src/config/navigation.ts', 'apps-script/Config.gs'])).toEqual([
      { label: '導覽', path: 'vue-build/src/config/navigation.ts' },
      { label: '後端', path: 'apps-script/Config.gs' },
    ])
  })

  it('names tables and actions by the table label and sorts them by file name', () => {
    const groups = navGroups([
      'vue-build/src/composables/actions/useOrderLineActions.ts',
      'vue-build/src/composables/actions/useCustomerActions.ts',
      'vue-build/src/schema/tables/orderLine.ts',
      'vue-build/src/schema/tables/customer.ts',
    ], { orderLine: '訂單明細' })

    expect(groups[0]!.children).toEqual([
      { label: 'customer', path: 'vue-build/src/schema/tables/customer.ts' },
      { label: '訂單明細', detail: 'orderLine', path: 'vue-build/src/schema/tables/orderLine.ts' },
    ])
    expect(groups[1]!.children).toEqual([
      { label: 'customer', path: 'vue-build/src/composables/actions/useCustomerActions.ts' },
      { label: '訂單明細', detail: 'orderLine', path: 'vue-build/src/composables/actions/useOrderLineActions.ts' },
    ])
  })

  it('shows pages by their fixed names with [id] flattened into the table folder', () => {
    const groups = navGroups([
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/pages/order/[id]/index.vue',
      'vue-build/src/pages/order/[id]/customer.vue',
      'vue-build/src/pages/order/[id]/orderLine.vue',
      'vue-build/src/pages/order/[id]/history.vue',
      'vue-build/src/pages/order/_ref/OrderList.vue',
      'vue-build/src/pages/dashboard.vue',
      'vue-build/src/pages/index.vue',
      'vue-build/src/pages/login.vue',
      'vue-build/src/pages/sales/index.vue',
      'vue-build/src/schema/tables/customer.ts',
      'vue-build/src/schema/tables/order.ts',
      'vue-build/src/schema/tables/orderLine.ts',
    ], { customer: '客戶', order: '訂單', orderLine: '訂單明細' })

    expect(groups[1]!.children).toEqual([
      { label: '登入頁', path: 'vue-build/src/pages/login.vue' },
      { label: '首頁', path: 'vue-build/src/pages/index.vue' },
      { label: 'dashboard', path: 'vue-build/src/pages/dashboard.vue' },
      {
        label: '訂單',
        detail: 'order',
        children: [
          { label: '列表頁', path: 'vue-build/src/pages/order/index.vue' },
          { label: '詳細頁', path: 'vue-build/src/pages/order/[id]/index.vue' },
          { label: '展開頁：客戶', path: 'vue-build/src/pages/order/[id]/customer.vue' },
          { label: '展開頁：訂單明細', path: 'vue-build/src/pages/order/[id]/orderLine.vue' },
          { label: 'history', path: 'vue-build/src/pages/order/[id]/history.vue' },
          { label: '引用畫面', children: [{ label: 'OrderList', path: 'vue-build/src/pages/order/_ref/OrderList.vue' }] },
        ],
      },
      {
        label: 'sales',
        children: [{ label: '列表頁', path: 'vue-build/src/pages/sales/index.vue' }],
      },
    ])
  })

  it('omits empty groups', () => {
    expect(navGroups([])).toEqual([])
  })
})
