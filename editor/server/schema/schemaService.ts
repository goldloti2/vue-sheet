// 表單對 schema 檔的修改：依序套用，回傳修改後的全文。任一項失敗時不套用任何一項
import type { CodeContext, ColumnTypeInfo, SchemaEdit, SchemaPath } from '../../shared/schema.ts'
import type { TypeScript } from '../vueBuild.ts'
import { addColumn, removeColumn, setColumnType } from './schemaColumns.ts'
import { ensureNamedImport, insertItem, moveItem, removeItem, replaceValue, SchemaEditError, setProperty } from './schemaEdits.ts'
import { checkExpression } from './syntaxCheck.ts'

function checkCode (ts: TypeScript, valueText: string | null, code: boolean | undefined): void {
  if (code && valueText !== null) {
    const error = checkExpression(ts, valueText)
    if (error) {
      throw new SchemaEditError(error)
    }
  }
}

function applyEdit (ts: TypeScript, text: string, edit: SchemaEdit, columnTypes: readonly ColumnTypeInfo[]): string {
  switch (edit.kind) {
    case 'replace': {
      checkCode(ts, edit.valueText, edit.code)
      return replaceValue(ts, text, edit.path, edit.valueText)
    }
    case 'setProperty': {
      checkCode(ts, edit.valueText, edit.code)
      return setProperty(ts, text, edit.objectPath, edit.name, edit.valueText, { after: edit.after })
    }
    case 'insert': {
      return insertItem(ts, text, edit.arrayPath, edit.index, edit.itemText, edit.multiline ? 'multiline' : 'inline')
    }
    case 'remove': {
      return removeItem(ts, text, edit.arrayPath, edit.index)
    }
    case 'move': {
      return moveItem(ts, text, edit.arrayPath, edit.from, edit.to)
    }
    case 'setColumnType': {
      return setColumnType(ts, text, edit.key, edit.type, columnTypes)
    }
    case 'addColumn': {
      return addColumn(ts, text, edit.column, columnTypes)
    }
    case 'removeColumn': {
      return removeColumn(ts, text, edit.key)
    }
    case 'ensureImport': {
      return ensureNamedImport(ts, text, edit.name, edit.from)
    }
  }
}

export function applySchemaEdits (ts: TypeScript, text: string, edits: readonly SchemaEdit[], columnTypes: readonly ColumnTypeInfo[]): string {
  let next = text
  for (const edit of edits) {
    next = applyEdit(ts, next, edit, columnTypes)
  }
  return next
}

// 不會出現在程式中的標記，用於找出值的位置
const PLACEHOLDER = '__EDITOR_CODE_PLACEHOLDER__'

/** 物件屬性 name 的值於整個檔案中的前後文。屬性不存在時，以新增此屬性後的檔案為準 */
export function codeContext (ts: TypeScript, text: string, objectPath: SchemaPath, name: string): CodeContext {
  const marked = setProperty(ts, text, objectPath, name, PLACEHOLDER)
  const index = marked.indexOf(PLACEHOLDER)
  return { prefix: marked.slice(0, index), suffix: marked.slice(index + PLACEHOLDER.length) }
}
