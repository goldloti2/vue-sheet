// schema/index.ts 的 schemas：登記的表與其順序
import type { RegistryEdit, RegistryModel } from '../../shared/registry.ts'
import type { TypeScript } from '../vueBuild.ts'
import type TS from 'typescript'
import { applyEdits, insertItem, moveItem, removeItem } from './listEdits.ts'
import { ensureNamedImport, SchemaEditError } from './schemaEdits.ts'
import { listSpanOf, parseSource, propertyName, unwrap } from './schemaModel.ts'

function registryObject (ts: TypeScript, source: TS.SourceFile): TS.ObjectLiteralExpression | null {
  for (const statement of source.statements) {
    const declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : []
    const found = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'schemas')
    const value = found?.initializer ? unwrap(ts, found.initializer) : undefined
    if (value && ts.isObjectLiteralExpression(value)) {
      return value
    }
  }
  return null
}

/** schemas 中依序登記的表。找不到 schemas 物件時為 null */
export function parseRegistry (ts: TypeScript, text: string): RegistryModel | null {
  const object = registryObject(ts, parseSource(ts, text))
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

function loadObject (ts: TypeScript, text: string): { source: TS.SourceFile, object: TS.ObjectLiteralExpression } {
  const source = parseSource(ts, text)
  const object = registryObject(ts, source)
  if (!object) {
    throw new SchemaEditError('找不到 schemas 物件，請以文字編輯。')
  }
  return { source, object }
}

// 刪除只匯入 name 的 import。同一行還匯入其他名稱時只刪除 name
function removeNamedImport (ts: TypeScript, text: string, name: string): string {
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

function applyEdit (ts: TypeScript, text: string, edit: RegistryEdit): string {
  const { source, object } = loadObject(ts, text)
  const list = listSpanOf(ts, source, object)
  switch (edit.kind) {
    case 'move': {
      return applyEdits(text, moveItem(text, list, edit.from, edit.to))
    }
    case 'add': {
      if (object.properties.some(property => propertyName(ts, property) === edit.key)) {
        throw new SchemaEditError(`schemas 中已有 ${edit.key}。`)
      }
      const before = edit.before === undefined ? -1 : object.properties.findIndex(property => propertyName(ts, property) === edit.before)
      const index = before === -1 ? object.properties.length : before
      const added = applyEdits(text, insertItem(text, list, index, `${edit.key}: ${edit.variable}`, 'multiline'))
      return ensureNamedImport(ts, added, edit.variable, `./tables/${edit.key}`)
    }
    case 'remove': {
      const index = object.properties.findIndex(property => propertyName(ts, property) === edit.key)
      if (index === -1) {
        throw new SchemaEditError(`schemas 中沒有 ${edit.key}。`)
      }
      const property = object.properties[index]!
      const variable = ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer) ? property.initializer.text : null
      const removed = applyEdits(text, removeItem(text, list, index))
      return variable === null ? removed : removeNamedImport(ts, removed, variable)
    }
  }
}

/** 依序套用。任一項失敗時拋出錯誤 */
export function applyRegistryEdits (ts: TypeScript, text: string, edits: readonly RegistryEdit[]): string {
  let next = text
  for (const edit of edits) {
    next = applyEdit(ts, next, edit)
  }
  return next
}
