// 修改欄位的 key：Row 成員的所有引用由 language service 找出，同一檔案中以字串寫成的 key 另行修改
import type { FileContent } from '../../shared/api.ts'
import type { FileRewrite, KeyRenameRequest, KeyRenameResult } from '../../shared/schema.ts'
import type { DraftFile, RenameLocation } from '../../shared/typescript.ts'
import type { TypeScript } from '../vueBuild.ts'
import { columnKeyError } from '../../shared/schema.ts'
import { usedColumnKeys } from '../../shared/schemaForm.ts'
import { applyEdits } from './listEdits.ts'
import { findColumn, renameKeyLiterals, rowMemberNameStart } from './schemaColumns.ts'
import { SchemaEditError } from './schemaEdits.ts'
import { parseSchema } from './schemaModel.ts'

export interface KeyRenameTools {
  ts: TypeScript
  /** 專案中的路徑轉為絕對路徑。路徑不屬於專案時拋出錯誤 */
  absolute: (projectPath: string) => string
  /** 絕對路徑轉為專案中的路徑。不屬於專案時為 null */
  projectPath: (absolute: string) => string | null
  /** 位置 pos 的名稱改為 newName 時須修改之處 */
  rename: (file: string, text: string, pos: number, newName: string, drafts: DraftFile[]) => Promise<RenameLocation[]>
  readFile: (projectPath: string) => Promise<FileContent | null>
}

function rewrite (text: string, locations: readonly RenameLocation[]): string {
  return applyEdits(text, locations.map(location => ({ from: location.from, to: location.to, insert: location.text })))
}

export async function planKeyRename (tools: KeyRenameTools, request: KeyRenameRequest): Promise<KeyRenameResult> {
  const { ts, absolute } = tools
  const { path, text, oldKey, newKey } = request
  if (!findColumn(ts, text, oldKey)) {
    throw new SchemaEditError(`找不到欄位 ${oldKey}。`)
  }
  const error = columnKeyError(newKey, usedColumnKeys(parseSchema(ts, text)))
  if (error) {
    throw new SchemaEditError(error)
  }

  const pos = rowMemberNameStart(ts, text, oldKey)
  const draftFiles = request.drafts.map(draft => ({ file: absolute(draft.path), text: draft.text }))
  const locations = pos === null ? [] : await tools.rename(absolute(path), text, pos, newKey, draftFiles)

  // 依檔案分組
  const byFile = new Map<string, RenameLocation[]>()
  for (const location of locations) {
    const file = tools.projectPath(location.file)
    if (file === null) {
      throw new SchemaEditError(`${location.file} 引用此欄位，但不屬於專案的檔案。請以其他編輯器修改。`)
    }
    byFile.set(file, [...byFile.get(file) ?? [], location])
  }

  // 有未儲存內容的檔案以該內容修改，位置由同一份內容算出
  const drafts = new Map(request.drafts.map(draft => [draft.path, draft.text]))
  const others: FileRewrite[] = []
  for (const [file, fileLocations] of byFile) {
    if (file === path) {
      continue
    }
    const draft = drafts.get(file)
    const base = draft === undefined ? await tools.readFile(file) : null
    if (draft === undefined && !base) {
      throw new SchemaEditError(`找不到檔案 ${file}。`)
    }
    others.push({ path: file, text: rewrite(draft ?? base!.text, fileLocations), base })
  }

  const renamed = rewrite(text, byFile.get(path) ?? [])
  return { text: renameKeyLiterals(ts, renamed, oldKey, newKey), others: others.toSorted((a, b) => a.path.localeCompare(b.path)) }
}
