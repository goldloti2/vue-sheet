import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

// 編輯器只讀寫專案的檔案（見 AGENTS.md 的「框架與專案」）。路徑相對於 repo 根目錄，以 / 分隔
const PROJECT_FILE_PATTERNS = [
  /^vue-build\/src\/pages\/.+\.(?:vue|ts)$/,
  /^vue-build\/src\/schema\/tables\/[^/]+\.ts$/,
  /^vue-build\/src\/schema\/index\.ts$/,
  /^vue-build\/src\/composables\/actions\/use\w+Actions\.ts$/,
  /^vue-build\/src\/config\/navigation\.ts$/,
  /^vue-build\/src\/services\/mock\/tables\.ts$/,
  /^vue-build\/mock\/[^/]+\.csv$/,
  /^apps-script\/Config\.gs$/,
]

// 符合上列規則但屬於框架的檔案
const FRAMEWORK_FILES = new Set([
  'vue-build/src/composables/actions/useTableActions.ts',
])

// 監看與列出檔案時走訪的資料夾
export const PROJECT_DIRS = [
  'vue-build/src/pages',
  'vue-build/src/schema',
  'vue-build/src/composables/actions',
  'vue-build/src/config',
  'vue-build/src/services/mock',
  'vue-build/mock',
  'apps-script',
]

export class ScopeError extends Error {
  constructor (filePath: string) {
    super(`不是專案的檔案：${filePath}`)
  }
}

// 路徑須已正規化：不含 ..、.、反斜線、開頭的 /
export function isProjectFile (filePath: string): boolean {
  if (filePath !== path.posix.normalize(filePath) || filePath.startsWith('/') || filePath.includes('\\') || filePath.startsWith('..')) {
    return false
  }
  return !FRAMEWORK_FILES.has(filePath) && PROJECT_FILE_PATTERNS.some(pattern => pattern.test(filePath))
}

export function assertProjectFile (filePath: string): void {
  if (!isProjectFile(filePath)) {
    throw new ScopeError(filePath)
  }
}

export function absolutePath (root: string, filePath: string): string {
  assertProjectFile(filePath)
  return path.join(root, ...filePath.split('/'))
}

async function walk (root: string, dir: string): Promise<string[]> {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const child = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      return walk(root, child)
    }
    return entry.isFile() ? [child] : []
  }))
  return nested.flat()
}

export async function listProjectFiles (root: string): Promise<string[]> {
  const found = await Promise.all(PROJECT_DIRS
    .filter(dir => existsSync(path.join(root, dir)))
    .map(dir => walk(root, dir)))
  return found.flat().filter(file => isProjectFile(file)).toSorted()
}
