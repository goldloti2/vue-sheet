// vue-build/src/config/navigation.ts：底部導覽列與側邊欄的項目
import type { ConfigValue } from '../shared/configGs.ts'
import type { NavigationEdit, NavigationModel, NavItemEntry, NavItemInput, NavListRef, NavSectionEntry } from '../shared/navigationForm.ts'
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import { literalText } from '../shared/schema.ts'
import { applyEdits, insertItem, moveItem, removeItem } from './schema/listEdits.ts'
import { removeNamedImport } from './schema/registry.ts'
import { ensureNamedImport, SchemaEditError } from './schema/schemaEdits.ts'
import { findProperty, listSpanOf, parseSource, unwrap } from './schema/schemaModel.ts'
import { code, constantOf, replaceRange, stringOf } from './topLevelConstants.ts'

const ICONS_FROM = '@mdi/js'
const ICON_NAME = /^mdi\w+$/

function arrayOf (ts: TypeScript, source: TS.SourceFile, name: string): TS.ArrayLiteralExpression | null {
  const value = constantOf(ts, source, name)
  const inner = value ? unwrap(ts, value) : null
  return inner && ts.isArrayLiteralExpression(inner) ? inner : null
}

function objectOf (ts: TypeScript, node: TS.Expression | undefined): TS.ObjectLiteralExpression | null {
  const inner = node ? unwrap(ts, node) : null
  return inner && ts.isObjectLiteralExpression(inner) ? inner : null
}

// 圖示以 mdi 開頭的名稱直接寫成時為 value
function iconOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression | undefined): ConfigValue<string> {
  if (!node) {
    return null
  }
  const inner = unwrap(ts, node)
  return ts.isIdentifier(inner) && ICON_NAME.test(inner.text) ? { kind: 'value', value: inner.text } : code(node, source)
}

function itemOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression): NavItemEntry {
  const object = objectOf(ts, node)
  if (!object) {
    return code(node, source)
  }
  return {
    kind: 'item',
    item: {
      title: stringOf(ts, source, findProperty(ts, object, 'title')?.initializer),
      icon: iconOf(ts, source, findProperty(ts, object, 'icon')?.initializer),
      to: stringOf(ts, source, findProperty(ts, object, 'to')?.initializer),
    },
  }
}

function sectionOf (ts: TypeScript, source: TS.SourceFile, node: TS.Expression): NavSectionEntry {
  const object = objectOf(ts, node)
  if (!object) {
    return code(node, source)
  }
  const items = findProperty(ts, object, 'items')?.initializer
  const array = items ? unwrap(ts, items) : null
  return {
    kind: 'section',
    title: stringOf(ts, source, findProperty(ts, object, 'title')?.initializer),
    icon: iconOf(ts, source, findProperty(ts, object, 'icon')?.initializer),
    items: array && ts.isArrayLiteralExpression(array) ? array.elements.map(element => itemOf(ts, source, element)) : null,
  }
}

/** navigation.ts 的兩份清單。routes 為 pages/ 中的頁面的網址 */
export function parseNavigation (ts: TypeScript, text: string, routes: string[]): NavigationModel {
  const source = parseSource(ts, text)
  return {
    navItems: arrayOf(ts, source, 'navItems')?.elements.map(element => itemOf(ts, source, element)) ?? null,
    drawerSections: arrayOf(ts, source, 'drawerSections')?.elements.map(element => sectionOf(ts, source, element)) ?? null,
    routes,
  }
}

function requireArray (ts: TypeScript, source: TS.SourceFile, name: string): TS.ArrayLiteralExpression {
  const array = arrayOf(ts, source, name)
  if (!array) {
    throw new SchemaEditError(`navigation.ts 中找不到 ${name} 陣列，請以其他編輯器修改。`)
  }
  return array
}

function requireSection (ts: TypeScript, source: TS.SourceFile, index: number): TS.ObjectLiteralExpression {
  const element = requireArray(ts, source, 'drawerSections').elements[index]
  const object = objectOf(ts, element)
  if (!object) {
    throw new SchemaEditError(`側邊欄的第 ${index + 1} 組以程式碼寫成，請以其他編輯器修改。`)
  }
  return object
}

// 清單的陣列
function listArray (ts: TypeScript, source: TS.SourceFile, at: NavListRef): TS.ArrayLiteralExpression {
  if (at.list === 'navItems') {
    return requireArray(ts, source, 'navItems')
  }
  const items = findProperty(ts, requireSection(ts, source, at.section), 'items')?.initializer
  const array = items ? unwrap(ts, items) : null
  if (!array || !ts.isArrayLiteralExpression(array)) {
    throw new SchemaEditError(`側邊欄的第 ${at.section + 1} 組的 items 以程式碼寫成，請以其他編輯器修改。`)
  }
  return array
}

function requireItem (ts: TypeScript, source: TS.SourceFile, at: NavListRef, index: number): TS.ObjectLiteralExpression {
  const object = objectOf(ts, listArray(ts, source, at).elements[index])
  if (!object) {
    throw new SchemaEditError('此項目以程式碼寫成，請以其他編輯器修改。')
  }
  return object
}

function itemText ({ title, icon, to }: NavItemInput): string {
  return `{ title: ${literalText(title)}, icon: ${icon}, to: ${literalText(to)} }`
}

function checkIcon (icon: string): void {
  if (!ICON_NAME.test(icon)) {
    throw new SchemaEditError(`圖示須為 @mdi/js 的名稱：${icon}`)
  }
}

// 設定物件的屬性。value 為 null 時刪除。新增的 title 置於最前，icon 置於 title 之後
function setObjectProperty (ts: TypeScript, text: string, source: TS.SourceFile, object: TS.ObjectLiteralExpression, name: string, valueText: string | null): string {
  const property = findProperty(ts, object, name)
  const list = listSpanOf(ts, source, object)
  if (property) {
    const index = object.properties.indexOf(property)
    return valueText === null
      ? applyEdits(text, removeItem(text, list, index))
      : replaceRange(text, property.initializer, source, valueText)
  }
  if (valueText === null) {
    return text
  }
  const position = name === 'icon' && findProperty(ts, object, 'title') ? 1 : 0
  return applyEdits(text, insertItem(text, list, position, `${name}: ${valueText}`))
}

function applyEdit (ts: TypeScript, text: string, edit: NavigationEdit): string {
  const source = parseSource(ts, text)
  switch (edit.kind) {
    case 'setItem': {
      const object = requireItem(ts, source, edit.at, edit.index)
      if (edit.name === 'icon') {
        checkIcon(edit.value)
      }
      const next = setObjectProperty(ts, text, source, object, edit.name, edit.name === 'icon' ? edit.value : literalText(edit.value))
      return edit.name === 'icon' ? ensureNamedImport(ts, next, edit.value, ICONS_FROM) : next
    }
    case 'addItem': {
      checkIcon(edit.item.icon)
      const array = listArray(ts, source, edit.at)
      const next = applyEdits(text, insertItem(text, listSpanOf(ts, source, array), array.elements.length, itemText(edit.item), 'multiline'))
      return ensureNamedImport(ts, next, edit.item.icon, ICONS_FROM)
    }
    case 'removeItem': {
      return applyEdits(text, removeItem(text, listSpanOf(ts, source, listArray(ts, source, edit.at)), edit.index))
    }
    case 'moveItem': {
      return applyEdits(text, moveItem(text, listSpanOf(ts, source, listArray(ts, source, edit.at)), edit.from, edit.to))
    }
    case 'transferItem': {
      const element = listArray(ts, source, edit.from).elements[edit.index]
      if (!element) {
        throw new SchemaEditError('找不到要移動的項目。')
      }
      const moved = element.getText(source)
      const removed = applyEdits(text, removeItem(text, listSpanOf(ts, source, listArray(ts, source, edit.from)), edit.index))
      const next = parseSource(ts, removed)
      return applyEdits(removed, insertItem(removed, listSpanOf(ts, next, listArray(ts, next, edit.to)), edit.position, moved, 'multiline'))
    }
    case 'setSection': {
      if (edit.name === 'icon' && edit.value !== null) {
        checkIcon(edit.value)
      }
      const valueText = edit.value === null ? null : (edit.name === 'icon' ? edit.value : literalText(edit.value))
      const next = setObjectProperty(ts, text, source, requireSection(ts, source, edit.section), edit.name, valueText)
      if (edit.name === 'title' && edit.value === null) {
        // 清空標題時一併刪除圖示
        const cleared = parseSource(ts, next)
        return setObjectProperty(ts, next, cleared, requireSection(ts, cleared, edit.section), 'icon', null)
      }
      return edit.name === 'icon' && edit.value !== null ? ensureNamedImport(ts, next, edit.value, ICONS_FROM) : next
    }
    case 'addSection': {
      const title = edit.title === null ? '' : `  title: ${literalText(edit.title)},\n`
      const item = `{\n${title}  items: [],\n}`
      return applyEdits(text, insertItem(text, listSpanOf(ts, source, requireArray(ts, source, 'drawerSections')), edit.index, item, 'multiline'))
    }
    case 'removeSection': {
      return applyEdits(text, removeItem(text, listSpanOf(ts, source, requireArray(ts, source, 'drawerSections')), edit.section))
    }
    case 'moveSection': {
      return applyEdits(text, moveItem(text, listSpanOf(ts, source, requireArray(ts, source, 'drawerSections')), edit.from, edit.to))
    }
  }
}

// 匯入宣告以外的識別字
function usedNames (ts: TypeScript, source: TS.SourceFile): Set<string> {
  const names = new Set<string>()
  const visit = (node: TS.Node): void => {
    if (ts.isImportDeclaration(node)) {
      return
    }
    if (ts.isIdentifier(node)) {
      names.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return names
}

/** 刪除不再使用的 @mdi/js 匯入 */
export function pruneIconImports (ts: TypeScript, text: string): string {
  const source = parseSource(ts, text)
  const used = usedNames(ts, source)
  const unused = source.statements.flatMap(statement => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== ICONS_FROM) {
      return []
    }
    const bindings = statement.importClause?.namedBindings
    return bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => element.name.text).filter(name => !used.has(name)) : []
  })
  return unused.reduce((next, name) => removeNamedImport(ts, next, name), text)
}

// 只有 items 陣列的組的項目數。其他寫法為 null
function plainUntitledLength (ts: TypeScript, node: TS.Expression | undefined): number | null {
  const object = objectOf(ts, node)
  const property = object?.properties.length === 1 ? findProperty(ts, object, 'items') : undefined
  const array = property ? unwrap(ts, property.initializer) : null
  return array && ts.isArrayLiteralExpression(array) ? array.elements.length : null
}

/** 刪除空的不分組的組，並合併相鄰的不分組的組。只處理只有 items 陣列的組 */
export function normalizeSections (ts: TypeScript, text: string): string {
  let next = text
  for (;;) {
    const sections = arrayOf(ts, parseSource(ts, next), 'drawerSections')?.elements ?? []
    const lengths = sections.map(section => plainUntitledLength(ts, section))
    const empty = lengths.indexOf(0)
    if (empty !== -1) {
      next = applyEdit(ts, next, { kind: 'removeSection', section: empty })
      continue
    }
    const merge = lengths.findIndex((length, index) => length !== null && (lengths[index + 1] ?? null) !== null)
    if (merge === -1) {
      return next
    }
    // 下一組的第一項移到這一組的最後，下一組變空時於下一輪刪除
    next = applyEdit(ts, next, { kind: 'transferItem', from: { list: 'drawer', section: merge + 1 }, index: 0, to: { list: 'drawer', section: merge }, position: lengths[merge]! })
  }
}

/** 依序套用，最後整理不分組的組，並刪除不再使用的圖示的匯入。任一項失敗時拋出錯誤 */
export function applyNavigationEdits (ts: TypeScript, text: string, edits: readonly NavigationEdit[]): string {
  let next = text
  for (const edit of edits) {
    next = applyEdit(ts, next, edit)
  }
  return pruneIconImports(ts, normalizeSections(ts, next))
}
