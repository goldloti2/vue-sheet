import type { FileContent, WriteResult } from '../shared/api.ts'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { absolutePath } from './projectFiles.ts'

// 寫入前修正格式。回傳修正後的內容
export type Formatter = (absolute: string, text: string) => Promise<string>

export function hashText (text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function readIfExists (absolute: string): Promise<string | null> {
  try {
    return await readFile(absolute, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function readProjectFile (root: string, filePath: string): Promise<FileContent | null> {
  const text = await readIfExists(absolutePath(root, filePath))
  return text === null ? null : { path: filePath, text, hash: hashText(text) }
}

// 檔案目前的 hash 與 baseHash 不同時不寫入，回傳目前的內容
export async function writeProjectFile (
  root: string,
  filePath: string,
  text: string,
  baseHash: string | null,
  format?: Formatter,
): Promise<WriteResult> {
  const absolute = absolutePath(root, filePath)
  const current = await readIfExists(absolute)
  const currentHash = current === null ? null : hashText(current)
  if (currentHash !== baseHash) {
    return { ok: false, file: current === null ? null : { path: filePath, text: current, hash: hashText(current) } }
  }

  const output = format ? await format(absolute, text) : text
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, output, 'utf8')
  return { ok: true, file: { path: filePath, text: output, hash: hashText(output) } }
}
