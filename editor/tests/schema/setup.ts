import type { TypeScript } from '../../server/vueBuild'
import type { ColumnTypeInfo } from '../../shared/schema'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { readColumnTypes } from '../../server/schema/columnTypes'
import { loadTypeScript } from '../../server/vueBuild'

// 只讀取 vue-build 的 typescript、types.ts 與表的範本
const vueBuildRoot = fileURLToPath(new URL('../../../vue-build', import.meta.url))

export interface SchemaTestContext {
  ts: TypeScript
  columnTypes: ColumnTypeInfo[]
  /** vue-build/template/table/schema.ts 的內容 */
  template: string
}

export async function loadSchemaTestContext (): Promise<SchemaTestContext> {
  const ts = await loadTypeScript(vueBuildRoot)
  const [types, template] = await Promise.all([
    readFile(`${vueBuildRoot}/src/schema/types.ts`, 'utf8'),
    readFile(`${vueBuildRoot}/template/table/schema.ts`, 'utf8'),
  ])
  return { ts, columnTypes: readColumnTypes(ts, types), template }
}

// 文字中 schema 物件與 Row 介面的部分，去掉開頭的 import 與註解
export function body (text: string): string {
  return text.slice(text.indexOf('export interface'))
}
