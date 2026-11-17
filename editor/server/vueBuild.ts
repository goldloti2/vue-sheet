import type { Formatter } from './files.ts'
import type { TypeScript } from './tableLabels.ts'
import type { ESLint } from 'eslint'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 預覽與檢查所用的工具一律取自 vue-build 的 node_modules，版本與正式 build 相同
export async function importFromVueBuild<T> (vueBuildRoot: string, specifier: string): Promise<T> {
  const require = createRequire(path.join(vueBuildRoot, 'package.json'))
  return await import(pathToFileURL(require.resolve(specifier)).href) as T
}

export async function loadTypeScript (vueBuildRoot: string): Promise<TypeScript> {
  const module = await importFromVueBuild<{ default: TypeScript }>(vueBuildRoot, 'typescript')
  return module.default
}

const LINTED_EXTENSIONS = new Set(['.ts', '.vue', '.js', '.mts'])

// 以 vue-build 的 ESLint 設定修正格式。vue-build 以外的檔案與其他副檔名照原樣回傳
export function createFormatter (vueBuildRoot: string): Formatter {
  let eslint: Promise<ESLint> | null = null

  return async (absolute, text) => {
    const relative = path.relative(vueBuildRoot, absolute)
    if (relative.startsWith('..') || !LINTED_EXTENSIONS.has(path.extname(absolute))) {
      return text
    }

    eslint ??= importFromVueBuild<{ ESLint: typeof ESLint }>(vueBuildRoot, 'eslint')
      .then(module => new module.ESLint({ cwd: vueBuildRoot, fix: true }))
    const [result] = await (await eslint).lintText(text, { filePath: absolute })
    return result?.output ?? text
  }
}
