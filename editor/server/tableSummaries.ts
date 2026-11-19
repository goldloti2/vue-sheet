import type { TableColumn, TableSummary } from '../shared/api.ts'
import type { SchemaValue } from '../shared/schema.ts'
import type { TypeScript } from './vueBuild.ts'
import { propertyValue, stringValue } from '../shared/schema.ts'
import { tableKeyOf } from '../shared/tableKeys.ts'
import { readProjectFile } from './files.ts'
import { parseSchema } from './schema/schemaModel.ts'

// 陣列中以物件字面值寫成、key 為字串的欄位
function columnsOf (value: SchemaValue | undefined, virtual: boolean): TableColumn[] {
  if (value?.kind !== 'array') {
    return []
  }
  return value.items.flatMap(item => {
    const key = stringValue(propertyValue(item, 'key'))
    const label = stringValue(propertyValue(item, 'label'))
    const sheetHeader = propertyValue(item, 'sheetHeader')
    const header = virtual ? null : (sheetHeader ? stringValue(sheetHeader) : label)
    const refTable = stringValue(propertyValue(item, 'refTable'))
    return key === null ? [] : [{ key, label, type: stringValue(propertyValue(item, 'type')), virtual, header, refTable }]
  })
}

// 讀取 schema 的表名與欄位，真實欄位在前。找不到 schema 物件時沒有表名與欄位
export function readTableSummary (ts: TypeScript, text: string): TableSummary {
  const { schema, variable } = parseSchema(ts, text)
  if (!schema) {
    return { label: null, variable, columns: [] }
  }
  return {
    label: stringValue(propertyValue(schema, 'tableLabel')),
    variable,
    columns: [...columnsOf(propertyValue(schema, 'columns'), false), ...columnsOf(propertyValue(schema, 'virtualColumns'), true)],
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
