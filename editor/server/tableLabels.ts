import type TS from 'typescript'
import { tableKeyOf } from '../shared/tableKeys.ts'
import { readProjectFile } from './files.ts'

export type TypeScript = typeof TS

// schema 中第一個以字串直接寫值的 tableLabel。其他寫法回傳 null
export function findTableLabel (ts: TypeScript, text: string): string | null {
  const source = ts.createSourceFile('schema.ts', text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  let label: string | null = null
  const visit = (node: TS.Node): void => {
    if (label !== null) {
      return
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'tableLabel'
      && ts.isStringLiteralLike(node.initializer)) {
      label = node.initializer.text
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return label
}

// 表的代號對應 tableLabel
export async function readTableLabels (ts: TypeScript, root: string, paths: readonly string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(paths.map(async filePath => {
    const key = tableKeyOf(filePath)
    const file = key === null ? null : await readProjectFile(root, filePath)
    const label = file ? findTableLabel(ts, file.text) : null
    return key !== null && label !== null ? [[key, label] as const] : []
  }))
  return Object.fromEntries(entries.flat())
}
