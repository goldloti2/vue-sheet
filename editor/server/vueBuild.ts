import type { Formatter } from './files.ts'
import type { TypeScript } from './tableLabels.ts'
import type { ESLint } from 'eslint'
import type TS from 'typescript'
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

/** Volar 的 Language，只列出此處用到的部分 */
export interface VolarLanguage {
  scripts: {
    set: (id: string, snapshot: TS.IScriptSnapshot) => void
    delete: (id: string) => void
  }
}

/** vue-tsc 所用的 Vue 語言工具，只列出此處用到的部分 */
export interface VueLanguageTools {
  createParsedCommandLine: (ts: TypeScript, host: TS.ParseConfigHost, configFileName: string) => TS.ParsedCommandLine & { vueOptions: unknown }
  createVueLanguagePlugin: (ts: TypeScript, options: TS.CompilerOptions, vueOptions: unknown, asFileName: (id: string) => string) => unknown
  createLanguage: (plugins: unknown[], registry: Map<string, unknown>, sync: (id: string) => void) => VolarLanguage
  FileMap: new (useCaseSensitiveFileNames: boolean) => Map<string, unknown>
  decorateLanguageServiceHost: (ts: TypeScript, language: VolarLanguage, host: TS.LanguageServiceHost) => void
  createProxyLanguageService: (service: TS.LanguageService) => { initialize: (language: VolarLanguage) => void, proxy: TS.LanguageService }
  resolveFileLanguageId: (filePath: string) => string | undefined
}

// CommonJS 的套件以 default 取得 module.exports
export async function loadVueLanguageTools (vueBuildRoot: string): Promise<VueLanguageTools> {
  const load = async <T>(specifier: string) => (await importFromVueBuild<{ default: T }>(vueBuildRoot, specifier)).default
  const [vue, language, typescript] = await Promise.all([
    load<Pick<VueLanguageTools, 'createParsedCommandLine' | 'createVueLanguagePlugin'>>('@vue/language-core'),
    load<Pick<VueLanguageTools, 'createLanguage' | 'FileMap'>>('@volar/language-core'),
    load<Pick<VueLanguageTools, 'decorateLanguageServiceHost' | 'createProxyLanguageService' | 'resolveFileLanguageId'>>('@volar/typescript'),
  ])
  return {
    createParsedCommandLine: vue.createParsedCommandLine,
    createVueLanguagePlugin: vue.createVueLanguagePlugin,
    createLanguage: language.createLanguage,
    FileMap: language.FileMap,
    decorateLanguageServiceHost: typescript.decorateLanguageServiceHost,
    createProxyLanguageService: typescript.createProxyLanguageService,
    resolveFileLanguageId: typescript.resolveFileLanguageId,
  }
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
