import type { TypeScript } from '../server/vueBuild'
import type { NavigationEdit, NavigationModel } from '../shared/navigationForm'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyNavigationEdits, normalizeSections, parseNavigation, removeNavLinks } from '../server/navigationForm'
import { loadTypeScript } from '../server/vueBuild'
import { addDrawerItemEdits, moveChoices, moveSectionEdits, navLinksOf, NEW_NAV_ITEM, pageRoutes, routeOfPage } from '../shared/navigationForm'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

let ts: TypeScript

beforeAll(async () => {
  ts = await loadTypeScript(vueBuildRoot)
}, 30_000)

const NAV = [
  'import type { AppNavItem, AppNavSection } from \'@/components/ui/shell/AppShell.vue\'',
  'import { mdiAccount, mdiCart } from \'@mdi/js\'',
  '',
  'export const navItems: AppNavItem[] = [',
  '  { title: \'訂單\', icon: mdiCart, to: \'/order\' },',
  '  ITEM,',
  ']',
  '',
  'export const drawerSections: AppNavSection[] = [',
  '  {',
  '    title: \'其他\',',
  '    items: [',
  '      { title: \'客戶\', icon: mdiAccount, to: \'/customer\' },',
  '    ],',
  '  },',
  '  {',
  '    items: [],',
  '  },',
  ']',
  '',
].join('\n')

const itemLine = (name: string) => `      { title: '${name}', icon: mdiCart, to: '/${name.toLowerCase()}' },`

function drawer (...sections: string[][]): string {
  return [
    'import { mdiCart } from \'@mdi/js\'',
    '',
    'export const navItems = []',
    '',
    'export const drawerSections = [',
    ...sections.flatMap(lines => ['  {', ...lines, '  },']),
    ']',
    '',
  ].join('\n')
}

const items = (...names: string[]) => names.length === 0 ? ['    items: [],'] : ['    items: [', ...names.map(name => itemLine(name)), '    ],']

// 不分組、空的有標題的組、不分組、有圖示的不分組
const SECTIONS = drawer(items('A'), ['    title: \'空的\',', ...items()], items('B'), ['    icon: mdiCart,', ...items()])

// 不分組、有標題的組、兩項的不分組
const STEPS = drawer(items('A'), ['    title: \'組\',', ...items()], items('B', 'C'))

const edit = (text: string, edits: NavigationEdit[]) => applyNavigationEdits(ts, text, edits)
const parse = (text: string) => parseNavigation(ts, text, [])
const titlesOf = (text: string) => parse(text).drawerSections!.map(section => section.kind === 'section' && section.title?.kind === 'value' ? section.title.value : null)
function linksOf (text: string) {
  return parse(text).drawerSections!.map(section => section.kind === 'section'
    ? (section.items ?? []).map(entry => entry.kind === 'item' && entry.item.to?.kind === 'value' ? entry.item.to.value : null)
    : null)
}

describe('parseNavigation', () => {
  it('reads the items and sections, and keeps other code as text', () => {
    expect(parseNavigation(ts, NAV, ['/order'])).toEqual({
      navItems: [
        { kind: 'item', item: { title: { kind: 'value', value: '訂單' }, icon: { kind: 'value', value: 'mdiCart' }, to: { kind: 'value', value: '/order' } } },
        { kind: 'code', text: 'ITEM' },
      ],
      drawerSections: [
        {
          kind: 'section',
          title: { kind: 'value', value: '其他' },
          icon: null,
          items: [{ kind: 'item', item: { title: { kind: 'value', value: '客戶' }, icon: { kind: 'value', value: 'mdiAccount' }, to: { kind: 'value', value: '/customer' } } }],
        },
        { kind: 'section', title: null, icon: null, items: [] },
      ],
      routes: ['/order'],
    })
  })

  it('has no lists when the arrays are missing or written as code', () => {
    expect(parse('export const navItems = makeItems()')).toEqual({ navItems: null, drawerSections: null, routes: [] })
  })

  it('lists the literal links', () => {
    expect(navLinksOf(parse(NAV))).toEqual([{ title: '訂單', to: '/order' }, { title: '客戶', to: '/customer' }])
  })
})

describe('applyNavigationEdits', () => {
  it('sets the item values and imports a new icon, removing the unused one', () => {
    const text = edit(NAV, [
      { kind: 'setItem', at: { list: 'navItems' }, index: 0, name: 'title', value: '購物車' },
      { kind: 'setItem', at: { list: 'navItems' }, index: 0, name: 'icon', value: 'mdiBasket' },
    ])

    expect(text).toContain('{ title: \'購物車\', icon: mdiBasket, to: \'/order\' }')
    expect(text).toContain('import { mdiAccount, mdiBasket } from \'@mdi/js\'')
  })

  it('adds, moves and removes items', () => {
    const added = edit(NAV, [{ kind: 'addItem', at: { list: 'drawer', section: 1 }, item: NEW_NAV_ITEM }])
    expect(added).toContain('    items: [\n      { title: \'新項目\', icon: mdiLink, to: \'/\' },\n    ],')
    expect(added).toContain('mdiLink } from \'@mdi/js\'')

    const moved = edit(NAV, [{ kind: 'moveItem', at: { list: 'navItems' }, from: 1, to: 0 }])
    expect(moved).toContain('  ITEM,\n  { title: \'訂單\', icon: mdiCart, to: \'/order\' },\n]')

    const removed = edit(NAV, [{ kind: 'removeItem', at: { list: 'drawer', section: 0 }, index: 0 }])
    expect(removed).toContain('    title: \'其他\',\n    items: [],')
    expect(removed).toContain('import { mdiCart } from \'@mdi/js\'')
  })

  it('moves an item to another list', () => {
    const text = edit(NAV, [{ kind: 'transferItem', from: { list: 'drawer', section: 0 }, index: 0, to: { list: 'navItems' }, position: 2 }])

    expect(text).toContain('  ITEM,\n  { title: \'客戶\', icon: mdiAccount, to: \'/customer\' },\n]')
    expect(parse(text).drawerSections![0]).toMatchObject({ items: [] })
  })

  it('sets, adds, moves and removes sections', () => {
    const titled = edit(NAV, [
      { kind: 'setSection', section: 1, name: 'title', value: '更多' },
      { kind: 'setSection', section: 1, name: 'icon', value: 'mdiStar' },
    ])
    expect(titled).toContain('  {\n    title: \'更多\',\n    icon: mdiStar,\n    items: [],\n  },')

    const untitled = edit(NAV, [{ kind: 'setSection', section: 0, name: 'title', value: null }])
    expect(parse(untitled).drawerSections![0]).toMatchObject({ title: null })

    const added = edit(NAV, [{ kind: 'addSection', index: 2, title: '新的組' }])
    expect(added).toContain('  },\n  {\n    title: \'新的組\',\n    items: [],\n  },\n]')

    const moved = edit(NAV, [
      { kind: 'addSection', index: 2, title: '後面' },
      { kind: 'moveSection', from: 2, to: 0 },
    ])
    expect(titlesOf(moved)).toEqual(['後面', '其他'])

    const removed = edit(NAV, [{ kind: 'removeSection', section: 0 }])
    expect(parse(removed).drawerSections).toEqual([])
  })

  it('removes the icon when the section title is cleared', () => {
    const text = edit(NAV.replace('    title: \'其他\',\n', '    title: \'其他\',\n    icon: mdiCart,\n'), [{ kind: 'setSection', section: 0, name: 'title', value: null }])

    expect(parse(text).drawerSections![0]).toMatchObject({ title: null, icon: null })
  })

  it('removes empty untitled sections and merges adjacent ones, keeping the titled ones', () => {
    const merged = edit(SECTIONS, [{ kind: 'removeSection', section: 1 }])
    expect(linksOf(merged)).toEqual([['/a', '/b'], []])
    expect(parse(merged).drawerSections![1]).toMatchObject({ icon: { value: 'mdiCart' } })

    const emptied = edit(SECTIONS, [{ kind: 'transferItem', from: { list: 'drawer', section: 2 }, index: 0, to: { list: 'navItems' }, position: 0 }])
    expect(titlesOf(emptied)).toEqual([null, '空的', null])
    expect(linksOf(emptied)).toEqual([['/a'], [], []])

    expect(normalizeSections(ts, SECTIONS)).toBe(SECTIONS)
  })

  it('moves a section past one item of an untitled section', () => {
    const model = parse(STEPS)
    const down = edit(STEPS, moveSectionEdits(model, 1, 1))
    expect(titlesOf(down)).toEqual([null, '組', null])
    expect(linksOf(down)).toEqual([['/a', '/b'], [], ['/c']])

    const back = edit(down, moveSectionEdits(parse(down), 1, -1))
    expect(linksOf(back)).toEqual([['/a'], [], ['/b', '/c']])

    const up = edit(STEPS, moveSectionEdits(model, 1, -1))
    expect(titlesOf(up)).toEqual(['組', null])
    expect(linksOf(up)).toEqual([[], ['/a', '/b', '/c']])

    const top = parse(STEPS.replace('    items: [\n      { title: \'A\', icon: mdiCart, to: \'/a\' },\n    ],\n', '    title: \'上\',\n    items: [],\n'))
    expect(moveSectionEdits(top, 1, -1)).toEqual([{ kind: 'moveSection', from: 1, to: 0 }])
  })

  it('throws for code and for an icon that is not an mdi name', () => {
    expect(() => edit(NAV, [{ kind: 'setItem', at: { list: 'navItems' }, index: 1, name: 'title', value: 'A' }])).toThrow('以程式碼寫成')
    expect(() => edit(NAV, [{ kind: 'setItem', at: { list: 'navItems' }, index: 0, name: 'icon', value: 'star' }])).toThrow('@mdi/js')
    expect(() => edit('export const navItems = []', [{ kind: 'addSection', index: 0, title: null }])).toThrow('drawerSections')
  })
})

describe('removeNavLinks', () => {
  it('removes the items that link to the routes from every list', () => {
    const text = removeNavLinks(ts, NAV, ['/order', '/customer'])

    expect(parse(text).navItems).toEqual([{ kind: 'code', text: 'ITEM' }])
    expect(parse(text).drawerSections![0]).toMatchObject({ items: [] })
    expect(text).not.toContain('@mdi/js')
    expect(removeNavLinks(ts, NAV, ['/other'])).toBe(NAV)
  })
})

describe('routeOfPage', () => {
  it('maps the static pages to their routes', () => {
    expect(routeOfPage('vue-build/src/pages/index.vue')).toBe('/')
    expect(routeOfPage('vue-build/src/pages/order/index.vue')).toBe('/order')
    expect(routeOfPage('vue-build/src/pages/order-chart.vue')).toBe('/order-chart')
    expect(routeOfPage('vue-build/src/pages/order/[id]/index.vue')).toBeNull()
    expect(routeOfPage('vue-build/src/pages/order/_ref/OrderList.vue')).toBeNull()
    expect(routeOfPage('vue-build/src/pages/login.vue')).toBeNull()
    expect(routeOfPage('vue-build/src/schema/index.ts')).toBeNull()
    expect(pageRoutes(['vue-build/src/pages/order/index.vue', 'vue-build/src/pages/index.vue'])).toEqual(['/', '/order'])
  })
})

describe('moveChoices', () => {
  const model = (): NavigationModel => parse(NAV)
  const item = { kind: 'item' as const, item: { title: null, icon: null, to: null } }

  it('offers the drawer and the titled sections for a bottom item', () => {
    const choices = moveChoices(model(), { list: 'navItems' })

    expect(choices.map(choice => choice.title)).toEqual(['側邊欄（不分組）', '其他'])
    expect(choices[0]!.edits(0)).toEqual([{ kind: 'transferItem', from: { list: 'navItems' }, index: 0, to: { list: 'drawer', section: 1 }, position: 0 }])
  })

  it('moves an item out of its section, adding an untitled section when needed', () => {
    const withTitledNext = parse(NAV.replace('  {\n    items: [],\n  },\n', '  {\n    title: \'後面\',\n    items: [],\n  },\n'))
    const out = (current: NavigationModel) => moveChoices(current, { list: 'drawer', section: 0 }).find(choice => choice.title === '移出組')!

    expect(out(model()).edits(0)).toEqual([{ kind: 'transferItem', from: { list: 'drawer', section: 0 }, index: 0, to: { list: 'drawer', section: 1 }, position: 0 }])
    expect(out(withTitledNext).edits(0)).toEqual([
      { kind: 'addSection', index: 1, title: null },
      { kind: 'transferItem', from: { list: 'drawer', section: 0 }, index: 0, to: { list: 'drawer', section: 1 }, position: 0 },
    ])
  })

  it('disables the bottom navigation when it is full, and has no 移出組 for untitled items', () => {
    const full = { ...model(), navItems: Array.from({ length: 5 }, () => item) }
    const choices = moveChoices(full, { list: 'drawer', section: 1 })

    expect(choices.map(choice => [choice.title, choice.disabled ?? false])).toEqual([['底部導覽列', true], ['其他', false]])
  })

  it('adds a drawer item to the last untitled section, or to a new one', () => {
    expect(addDrawerItemEdits(model(), NEW_NAV_ITEM)).toEqual([{ kind: 'addItem', at: { list: 'drawer', section: 1 }, item: NEW_NAV_ITEM }])
    expect(addDrawerItemEdits({ ...model(), drawerSections: model().drawerSections!.slice(0, 1) }, NEW_NAV_ITEM)).toEqual([
      { kind: 'addSection', index: 1, title: null },
      { kind: 'addItem', at: { list: 'drawer', section: 1 }, item: NEW_NAV_ITEM },
    ])
  })
})
