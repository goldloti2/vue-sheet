import type { TableColumn, TableSummary } from '../shared/api.ts'
import type { TypeScript } from './vueBuild.ts'
import type TS from 'typescript'
import { tableKeyOf } from '../shared/tableKeys.ts'
import { readProjectFile } from './files.ts'

// schema 物件為第一個含 tableLabel 屬性的物件字面值
function findSchemaObject (ts: TypeScript, source: TS.SourceFile): TS.ObjectLiteralExpression | null {
  let found: TS.ObjectLiteralExpression | null = null
  const visit = (node: TS.Node): void => {
    if (found !== null) {
      return
    }
    if (ts.isObjectLiteralExpression(node) && propertyOf(ts, node, 'tableLabel') !== undefined) {
      found = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function propertyOf (ts: TypeScript, object: TS.ObjectLiteralExpression, name: string): TS.Expression | undefined {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === name) {
      return property.initializer
    }
  }
  return undefined
}

// 以字串直接寫值時回傳字串，其他寫法回傳 null
function stringOf (ts: TypeScript, node: TS.Expression | undefined): string | null {
  return node && ts.isStringLiteralLike(node) ? node.text : null
}

// 陣列中以物件字面值寫成、key 為字串的欄位
function columnsOf (ts: TypeScript, node: TS.Expression | undefined, virtual: boolean): TableColumn[] {
  if (!node || !ts.isArrayLiteralExpression(node)) {
    return []
  }
  return node.elements.flatMap(element => {
    if (!ts.isObjectLiteralExpression(element)) {
      return []
    }
    const key = stringOf(ts, propertyOf(ts, element, 'key'))
    return key === null
      ? []
      : [{ key, label: stringOf(ts, propertyOf(ts, element, 'label')), type: stringOf(ts, propertyOf(ts, element, 'type')), virtual }]
  })
}

// 讀取 schema 的表名與欄位，真實欄位在前。找不到 schema 物件時沒有表名與欄位
export function readTableSummary (ts: TypeScript, text: string): TableSummary {
  const source = ts.createSourceFile('schema.ts', text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const schema = findSchemaObject(ts, source)
  if (!schema) {
    return { label: null, columns: [] }
  }
  return {
    label: stringOf(ts, propertyOf(ts, schema, 'tableLabel')),
    columns: [...columnsOf(ts, propertyOf(ts, schema, 'columns'), false), ...columnsOf(ts, propertyOf(ts, schema, 'virtualColumns'), true)],
  }
}

// 表的代號對應表名與欄位。只讀取 schema/tables/ 中的檔案
export async function readTableSummaries (ts: TypeScript, root: string, paths: readonly string[]): Promise<Record<string, TableSummary>> {
  const entries = await Promise.all(paths.map(async filePath => {
    const key = tableKeyOf(filePath)
    const file = key === null ? null : await readProjectFile(root, filePath)
    return key !== null && file ? [[key, readTableSummary(ts, file.text)] as const] : []
  }))
  return Object.fromEntries(entries.flat())
}
