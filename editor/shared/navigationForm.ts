// vue-build/src/config/navigation.ts 的解析結果與修改，服務與介面共用
import type { ConfigValue } from './configGs.ts'

export const NAVIGATION_FILE = 'vue-build/src/config/navigation.ts'

/** 底部導覽列顯示的項目數上限。須與 AppShell.vue 的 BOTTOM_NAV_MAX 相同 */
export const BOTTOM_NAV_MAX = 5

/** 新增項目的預設值 */
export const NEW_NAV_ITEM: NavItemInput = { title: '新項目', icon: 'mdiLink', to: '/' }

/** 新增組的預設標題 */
export const NEW_SECTION_TITLE = '新的組'

/** 一個導覽項目。icon 為 @mdi/js 的匯入名稱 */
export interface NavItemModel {
  title: ConfigValue<string>
  icon: ConfigValue<string>
  to: ConfigValue<string>
}

/** 清單中的一項。不是物件字面值時為整項的原文 */
export type NavItemEntry = { kind: 'item', item: NavItemModel } | { kind: 'code', text: string }

/** 側邊欄的一組。沒有 title 的組為不分組的項目。items 不是陣列字面值時為 null */
export type NavSectionEntry
  = | { kind: 'section', title: ConfigValue<string>, icon: ConfigValue<string>, items: NavItemEntry[] | null }
    | { kind: 'code', text: string }

export interface NavigationModel {
  /** 底部導覽列。找不到或不是陣列字面值時為 null */
  navItems: NavItemEntry[] | null
  /** 側邊欄。找不到或不是陣列字面值時為 null */
  drawerSections: NavSectionEntry[] | null
  /** pages/ 中的頁面的網址，供連結的選單使用 */
  routes: string[]
}

/** 項目所在的清單：底部導覽列，或側邊欄的第 section 組 */
export type NavListRef = { list: 'navItems' } | { list: 'drawer', section: number }

export interface NavItemInput {
  title: string
  icon: string
  to: string
}

/** 對 navigation.ts 的一項修改。依序套用，後面的修改以前面修改後的內容為準 */
export type NavigationEdit
  = | { kind: 'setItem', at: NavListRef, index: number, name: keyof NavItemInput, value: string }
    | { kind: 'addItem', at: NavListRef, item: NavItemInput }
    | { kind: 'removeItem', at: NavListRef, index: number }
    | { kind: 'moveItem', at: NavListRef, from: number, to: number }
    | { kind: 'transferItem', from: NavListRef, index: number, to: NavListRef, position: number }
    | { kind: 'setSection', section: number, name: 'title' | 'icon', value: string | null }
    | { kind: 'addSection', index: number, title: string | null }
    | { kind: 'removeSection', section: number }
    | { kind: 'moveSection', from: number, to: number }

export interface NavigationEditRequest {
  text: string
  edits: NavigationEdit[]
}

export interface NavigationEditResult {
  text: string
  model: NavigationModel
}

/** 「移至…」選單中的一項 */
export interface MoveOption {
  title: string
  disabled?: boolean
}

/** 「移至…」的一項，以及移動第 index 項時的修改 */
export interface MoveChoice extends MoveOption {
  edits: (index: number) => NavigationEdit[]
}

type ListedSection = Extract<NavSectionEntry, { kind: 'section' }> & { items: NavItemEntry[] }

// 以字面值寫成、items 也是陣列的組
function listedSection (section: NavSectionEntry | undefined): ListedSection | null {
  return section?.kind === 'section' && section.items !== null ? section as ListedSection : null
}

/** 有標題的組的名稱。標題以程式碼寫成時為「第 N 組」 */
export function sectionLabel (section: NavSectionEntry, index: number): string {
  return section.kind === 'section' && section.title?.kind === 'value' ? section.title.value : `第 ${index + 1} 組`
}

// 側邊欄的不分組項目的最後：最後一組為不分組時加在其中，否則於最後新增一組
function untitledAtEnd (sections: readonly NavSectionEntry[]): { prepare: NavigationEdit[], at: NavListRef, position: number } {
  const last = listedSection(sections.at(-1))
  if (last && last.title === null) {
    return { prepare: [], at: { list: 'drawer', section: sections.length - 1 }, position: last.items.length }
  }
  return { prepare: [{ kind: 'addSection', index: sections.length, title: null }], at: { list: 'drawer', section: sections.length }, position: 0 }
}

/** 側邊欄的「新增項目」：加入不分組的項目 */
export function addDrawerItemEdits (model: NavigationModel, item: NavItemInput): NavigationEdit[] {
  const { prepare, at } = untitledAtEnd(model.drawerSections ?? [])
  return [...prepare, { kind: 'addItem', at, item }]
}

// 有 items 陣列、沒有標題的組
function untitledSection (section: NavSectionEntry | undefined): ListedSection | null {
  const listed = listedSection(section)
  return listed && listed.title === null ? listed : null
}

/** 第 section 組上移（offset 為 -1）或下移（1）。旁邊為多於一項的不分組的組時，只越過最靠近的一項 */
export function moveSectionEdits (model: NavigationModel, section: number, offset: -1 | 1): NavigationEdit[] {
  const sections = model.drawerSections ?? []
  const neighbor = untitledSection(sections[section + offset])
  if (!neighbor || neighbor.items.length <= 1) {
    return [{ kind: 'moveSection', from: section, to: section + offset }]
  }
  if (offset === 1) {
    const before = untitledSection(sections[section - 1])
    return before
      ? [{ kind: 'transferItem', from: { list: 'drawer', section: section + 1 }, index: 0, to: { list: 'drawer', section: section - 1 }, position: before.items.length }]
      : [
          { kind: 'addSection', index: section, title: null },
          { kind: 'transferItem', from: { list: 'drawer', section: section + 2 }, index: 0, to: { list: 'drawer', section }, position: 0 },
        ]
  }
  const from: NavListRef = { list: 'drawer', section: section - 1 }
  const index = neighbor.items.length - 1
  return untitledSection(sections[section + 1])
    ? [{ kind: 'transferItem', from, index, to: { list: 'drawer', section: section + 1 }, position: 0 }]
    : [
        { kind: 'addSection', index: section + 1, title: null },
        { kind: 'transferItem', from, index, to: { list: 'drawer', section: section + 1 }, position: 0 },
      ]
}

/** from 中的項目可以移至的地方 */
export function moveChoices (model: NavigationModel, from: NavListRef): MoveChoice[] {
  const sections = model.drawerSections ?? []
  const transfer = (to: NavListRef, position: number, prepare: NavigationEdit[] = []) => (index: number): NavigationEdit[] =>
    [...prepare, { kind: 'transferItem', from, index, to, position }]
  const choices: MoveChoice[] = []

  if (from.list === 'drawer' && model.navItems !== null) {
    choices.push({ title: '底部導覽列', disabled: model.navItems.length >= BOTTOM_NAV_MAX, edits: transfer({ list: 'navItems' }, model.navItems.length) })
  }
  if (from.list === 'navItems' && model.drawerSections !== null) {
    const { prepare, at, position } = untitledAtEnd(sections)
    choices.push({ title: '側邊欄（不分組）', edits: transfer(at, position, prepare) })
  }
  for (const [index, section] of sections.entries()) {
    const listed = listedSection(section)
    if (listed && listed.title !== null && !(from.list === 'drawer' && from.section === index)) {
      choices.push({ title: sectionLabel(section, index), edits: transfer({ list: 'drawer', section: index }, listed.items.length) })
    }
  }
  if (from.list === 'drawer' && listedSection(sections[from.section])?.title) {
    const next = listedSection(sections[from.section + 1])
    const target: NavListRef = { list: 'drawer', section: from.section + 1 }
    const prepare: NavigationEdit[] = next && next.title === null ? [] : [{ kind: 'addSection', index: from.section + 1, title: null }]
    choices.push({ title: '移出組', edits: transfer(target, 0, prepare) })
  }
  return choices
}

/** 導覽中以字面值寫成的項目，供刪除表時比對 */
export interface NavLink {
  title: string | null
  to: string | null
}

const PAGES = 'vue-build/src/pages/'

/** pages/ 中的檔案對應的網址。動態路由、_ref 中的元件、登入頁與 .vue 以外的檔案為 null */
export function routeOfPage (path: string): string | null {
  if (!path.startsWith(PAGES) || !path.endsWith('.vue')) {
    return null
  }
  const segments = path.slice(PAGES.length, -'.vue'.length).split('/')
  if (segments.some(segment => segment.includes('[') || segment.startsWith('_')) || segments.join('/') === 'login') {
    return null
  }
  if (segments.at(-1) === 'index') {
    segments.pop()
  }
  return `/${segments.join('/')}`
}

/** 這些檔案中的頁面的網址，依字母排序，不重複 */
export function pageRoutes (paths: readonly string[]): string[] {
  return [...new Set(paths.map(path => routeOfPage(path)).filter(route => route !== null))].toSorted()
}

/** 兩份清單中以物件字面值寫成的項目 */
export function navLinksOf (model: NavigationModel): NavLink[] {
  const valueOf = (value: ConfigValue<string>) => value?.kind === 'value' ? value.value : null
  const links = (entries: readonly NavItemEntry[] | null) => (entries ?? []).flatMap(entry => entry.kind === 'item'
    ? [{ title: valueOf(entry.item.title), to: valueOf(entry.item.to) }]
    : [])
  return [
    ...links(model.navItems),
    ...(model.drawerSections ?? []).flatMap(section => section.kind === 'section' ? links(section.items) : []),
  ]
}
