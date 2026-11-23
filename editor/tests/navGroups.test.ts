import type * as EditorPages from '../shared/editorPages'
import type { NavNode } from '../shared/navGroups'
import { describe, expect, it, vi } from 'vitest'
import { SETTINGS_PAGE } from '../shared/editorPages'
import { navFolderValues, navGroups, navLocation, nodeFiles, nodeTargets, singleTarget } from '../shared/navGroups'

// 加上測試用的頁面，對應兩個檔案
vi.mock('../shared/editorPages', async importOriginal => {
  const actual = await importOriginal<typeof EditorPages>()
  const pages: Record<string, { title: string, paths: readonly string[] }> = { ...actual.EDITOR_PAGES, 'page:test': { title: '測試頁', paths: ['a.ts', 'b.ts'] } }
  const pageOf = (target: string) => pages[target] ?? null
  return { ...actual, pageOf, targetPaths: (target: string) => [...pageOf(target)?.paths ?? [target]] }
})

describe('navGroups', () => {
  it('groups the files by kind', () => {
    const groups = navGroups([
      'apps-script/Config.gs',
      'vue-build/mock/order-test.csv',
      'vue-build/src/composables/actions/index.ts',
      'vue-build/src/composables/actions/useOrderActions.ts',
      'vue-build/src/config/navigation.ts',
      'vue-build/src/pages/dashboard.vue',
      'vue-build/src/schema/index.ts',
      'vue-build/src/schema/tables/order.ts',
      'vue-build/src/services/mock/tables.ts',
    ])

    expect(groups.map(group => group.label)).toEqual(['表', '動作', '頁面', '導覽', '設定', '測試資料'])
    expect(groups[0]!.children).toEqual([
      { label: '總覽', path: 'vue-build/src/schema/index.ts' },
      { label: 'order', path: 'vue-build/src/schema/tables/order.ts' },
    ])
    expect(groups[1]!.children).toEqual([
      { label: '總覽', path: 'vue-build/src/composables/actions/index.ts' },
      { label: 'order', path: 'vue-build/src/composables/actions/useOrderActions.ts' },
    ])
    expect(groups[5]!.children!.map(node => node.label)).toEqual(['總覽', 'order-test.csv'])
  })

  it('puts the file of a single-file group under the group', () => {
    const groups = navGroups(['vue-build/src/config/navigation.ts'])

    expect(groups).toEqual([
      { label: '導覽', children: [{ label: '導覽列', path: 'vue-build/src/config/navigation.ts' }] },
    ])
    expect(groups.map(group => singleTarget(group))).toEqual(['vue-build/src/config/navigation.ts'])
  })

  it('lists the backend tables and the settings page under the settings group', () => {
    const [both] = navGroups(['apps-script/Config.gs', 'vue-build/src/config/app.ts'])
    const [appOnly] = navGroups(['vue-build/src/config/app.ts'])

    expect(both).toEqual({
      label: '設定',
      children: [{ label: '後端表頭', path: 'apps-script/Config.gs' }, { label: 'App 設定', page: SETTINGS_PAGE }],
    })
    expect(appOnly).toEqual({ label: '設定', children: [{ label: 'App 設定', page: SETTINGS_PAGE }] })
    expect(singleTarget(appOnly!)).toBe(SETTINGS_PAGE)
  })

  it('lists the files under a node', () => {
    const [pages] = navGroups([
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/pages/order/[id]/index.vue',
      'vue-build/src/pages/dashboard.vue',
    ])

    expect(nodeFiles(pages!).toSorted()).toEqual([
      'vue-build/src/pages/dashboard.vue',
      'vue-build/src/pages/order/[id]/index.vue',
      'vue-build/src/pages/order/index.vue',
    ])
    expect(singleTarget(pages!)).toBeNull()
  })

  it('treats a page node as one target with the files of the page', () => {
    const group: NavNode = { label: '設定', children: [{ label: '測試頁', page: 'page:test' }, { label: 'c', path: 'c.ts' }] }

    expect(nodeFiles(group)).toEqual(['a.ts', 'b.ts', 'c.ts'])
    expect(nodeTargets(group)).toEqual(['page:test', 'c.ts'])
    expect(navFolderValues(group, 'page:test')).toEqual([])
    expect(navLocation([group], 'page:test')).toBe('設定/測試頁')
    expect(singleTarget({ label: '設定', children: [{ label: '測試頁', page: 'page:test' }] })).toBe('page:test')
  })

  it('names tables and actions by the table label and sorts them by file name', () => {
    const groups = navGroups([
      'vue-build/src/composables/actions/useOrderLineActions.ts',
      'vue-build/src/composables/actions/useCustomerActions.ts',
      'vue-build/src/schema/tables/orderLine.ts',
      'vue-build/src/schema/tables/customer.ts',
    ], { tableLabels: { orderLine: '訂單明細' } })

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
    ], { tableLabels: { customer: '客戶', order: '訂單', orderLine: '訂單明細' } })

    expect(groups[1]!.children).toEqual([
      { label: '登入頁', path: 'vue-build/src/pages/login.vue' },
      { label: '首頁', path: 'vue-build/src/pages/index.vue' },
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
      { label: 'dashboard', path: 'vue-build/src/pages/dashboard.vue' },
      {
        label: 'sales',
        children: [{ label: '列表頁', path: 'vue-build/src/pages/sales/index.vue' }],
      },
    ])
  })

  it('orders tables, actions and table page folders by the schemas order', () => {
    const groups = navGroups([
      'vue-build/src/composables/actions/useCustomerActions.ts',
      'vue-build/src/composables/actions/useOrderActions.ts',
      'vue-build/src/pages/customer/index.vue',
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/pages/report.vue',
      'vue-build/src/schema/tables/customer.ts',
      'vue-build/src/schema/tables/draft.ts',
      'vue-build/src/schema/tables/order.ts',
    ], { tableLabels: { order: '訂單' }, tableOrder: ['order', 'customer'] })

    expect(groups[0]!.children!.map(node => node.label)).toEqual(['訂單', 'customer', 'draft'])
    expect(groups[1]!.children!.map(node => node.label)).toEqual(['訂單', 'customer'])
    expect(groups[2]!.children!.map(node => node.label)).toEqual(['訂單', 'customer', 'report'])
  })

  it('lists the folder values on the way to a file', () => {
    const pages = navGroups([
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/pages/order/_ref/OrderList.vue',
      'vue-build/src/pages/report.vue',
      'vue-build/src/schema/tables/order.ts',
    ], { tableLabels: { order: '訂單' } }).find(group => group.label === '頁面')

    expect(navFolderValues(pages!, 'vue-build/src/pages/order/_ref/OrderList.vue')).toEqual(['頁面/訂單', '頁面/訂單/引用畫面'])
    expect(navFolderValues(pages!, 'vue-build/src/pages/report.vue')).toEqual([])
    expect(navFolderValues(pages!, 'vue-build/src/pages/missing.vue')).toBeNull()
  })

  it('names the test data by the table and orders it by the schemas order', () => {
    const [data] = navGroups([
      'vue-build/mock/customer-test.csv',
      'vue-build/mock/extra.csv',
      'vue-build/mock/order-test.csv',
      'vue-build/src/services/mock/tables.ts',
    ], {
      tableLabels: { order: '訂單' },
      tableOrder: ['order', 'customer'],
      mockCsv: { customer: 'vue-build/mock/customer-test.csv', order: 'vue-build/mock/order-test.csv' },
    })

    expect(data!.children).toEqual([
      { label: '總覽', path: 'vue-build/src/services/mock/tables.ts' },
      { label: '訂單', detail: 'order', path: 'vue-build/mock/order-test.csv' },
      { label: 'customer', path: 'vue-build/mock/customer-test.csv' },
      { label: 'extra.csv', path: 'vue-build/mock/extra.csv' },
    ])
  })

  it('omits empty groups', () => {
    expect(navGroups([])).toEqual([])
  })

  it('joins the names on the way to a file', () => {
    const groups = navGroups([
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/config/navigation.ts',
      'vue-build/src/schema/tables/order.ts',
    ], { tableLabels: { order: '訂單' } })

    expect(navLocation(groups, 'vue-build/src/pages/order/index.vue')).toBe('頁面/訂單/列表頁')
    expect(navLocation(groups, 'vue-build/src/config/navigation.ts')).toBe('導覽/導覽列')
    expect(navLocation(groups, 'vue-build/src/pages/missing.vue')).toBeNull()
  })
})
