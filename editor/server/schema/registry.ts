// 登記檔中以表的代號為 key 的物件：schema/index.ts 的 schemas 與 composables/actions/index.ts 的 tableActions
import type { RegistryEdit, RegistryModel } from '../../shared/registry.ts'
import type { TypeScript } from '../vueBuild.ts'
import type TS from 'typescript'
import { actionsNameOf } from '../../shared/tableKeys.ts'
import { applyEdits, insertItem, moveItem, removeItem } from './listEdits.ts'
import { ensureNamedImport, SchemaEditError } from './schemaEdits.ts'
import { listSpanOf, parseSource, propertyName, unwrap } from './schemaModel.ts'

/** 登記的物件名，以及新增一項時 import 的路徑 */
export interface RegistrySpec {
  object: string
  importPath: (key: string) => string
}

export const SCHEMA_REGISTRY: RegistrySpec = { object: 'schemas', importPath: key => `./tables/${key}` }
export const ACTIONS_REGISTRY: RegistrySpec = { object: 'tableActions', importPath: key => `./${actionsNameOf(key)}` }

function registryObject (ts: TypeScript, source: TS.SourceFile, spec: RegistrySpec): TS.ObjectLiteralExpression | null {
  for (const statement of source.statements) {
    const declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : []
    const found = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === spec.object)
    const value = found?.initializer ? unwrap(ts, found.initializer) : undefined
    if (value && ts.isObjectLiteralExpression(value)) {
      return value
    }
  }
  return null
}

/** 依序登記的表。找不到登記的物件時為 null */
export function parseRegistry (ts: TypeScript, text: string, spec: RegistrySpec = SCHEMA_REGISTRY): RegistryModel | null {
  const object = registryObject(ts, parseSource(ts, text), spec)
  if (!object) {
    return null
  }
  return {
    entries: object.properties.map(property => {
      const variable = ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer)
        ? property.initializer.text
        : (ts.isShorthandPropertyAssignment(property) ? property.name.text : null)
      return { key: propertyName(ts, property), variable }
    }),
  }
}

function loadObject (ts: TypeScript, text: string, spec: RegistrySpec): { source: TS.SourceFile, object: TS.ObjectLiteralExpression } {
  const source = parseSource(ts, text)
  const object = registryObject(ts, source, spec)
  if (!object) {
    throw new SchemaEditError(`找不到 ${spec.object} 物件，請以文字編輯。`)
  }
  return { source, object }
}

/** 刪除只匯入 name 的 import。同一行還匯入其他名稱時只刪除 name */
export function removeNamedImport (ts: TypeScript, text: string, name: string): string {
  const source = parseSource(ts, text)
  for (const statement of source.statements) {
    const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined
    if (!bindings || !ts.isNamedImports(bindings)) {
      continue
    }
    const index = bindings.elements.findIndex(element => element.name.text === name)
    if (index === -1) {
      continue
    }
    if (bindings.elements.length > 1) {
      const list = { open: bindings.getStart(source) + 1, close: bindings.end - 1, items: bindings.elements.map(element => ({ from: element.getStart(source), to: element.end })), kind: 'object' as const }
      return applyEdits(text, removeItem(text, list, index))
    }
    const end = text[statement.end] === '\n' ? statement.end + 1 : statement.end
    return text.slice(0, statement.getStart(source)) + text.slice(end)
  }
  return text
}

function applyEdit (ts: TypeScript, text: string, edit: RegistryEdit, spec: RegistrySpec): string {
  const { source, object } = loadObject(ts, text, spec)
  const list = listSpanOf(ts, source, object)
  switch (edit.kind) {
    case 'move': {
      return applyEdits(text, moveItem(text, list, edit.from, edit.to))
    }
    case 'add': {
      if (object.properties.some(property => propertyName(ts, property) === edit.key)) {
        throw new SchemaEditError(`${spec.object} 中已有 ${edit.key}。`)
      }
      const before = edit.before === undefined ? -1 : object.properties.findIndex(property => propertyName(ts, property) === edit.before)
      const index = before === -1 ? object.properties.length : before
      const added = applyEdits(text, insertItem(text, list, index, `${edit.key}: ${edit.variable}`, 'multiline'))
      return ensureNamedImport(ts, added, edit.variable, spec.importPath(edit.key))
    }
    case 'remove': {
      const index = object.properties.findIndex(property => propertyName(ts, property) === edit.key)
      if (index === -1) {
        throw new SchemaEditError(`${spec.object} 中沒有 ${edit.key}。`)
      }
      const property = object.properties[index]!
      const variable = ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer) ? property.initializer.text : null
      const removed = applyEdits(text, removeItem(text, list, index))
      return variable === null ? removed : removeNamedImport(ts, removed, variable)
    }
  }
}

/** 依序套用。任一項失敗時拋出錯誤 */
export function applyRegistryEdits (ts: TypeScript, text: string, edits: readonly RegistryEdit[], spec: RegistrySpec = SCHEMA_REGISTRY): string {
  let next = text
  for (const edit of edits) {
    next = applyEdit(ts, next, edit, spec)
  }
  return next
}
