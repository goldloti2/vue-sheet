// TypeScript 的 language service：以 tsconfig 建立專案，未儲存的內容取代磁碟上的檔案
// .vue 檔經由 vue-tsc 所用的 Vue 語言工具轉為 TypeScript，診斷與補全的位置對應回 .vue 的原文
// 此檔由 worker 以 Node 直接執行：只使用可移除的型別語法，相對路徑的匯入須寫副檔名
import type { CodeCompletions, CodeDiagnostic } from '../shared/typescript.ts'
import type { TypeScript, VueLanguageTools } from './vueBuild.ts'
import type TS from 'typescript'
import { statSync } from 'node:fs'
import path from 'node:path'

// 全域範圍的補全項目可能上千，只回傳排序在前的項目
const MAX_COMPLETIONS = 1000

export interface CodeLanguageService {
  /** filePath 為絕對路徑 */
  diagnostics: (filePath: string, text: string) => CodeDiagnostic[]
  completions: (filePath: string, text: string, pos: number) => CodeCompletions
  /** 重新讀取 tsconfig 涵蓋的檔案，於新增或刪除檔案後呼叫 */
  refreshFiles: () => void
  /** 預先建立專案，第一次檢查無須等待 */
  warmUp: () => void
}

function severity (ts: TypeScript, category: TS.DiagnosticCategory): CodeDiagnostic['severity'] {
  if (category === ts.DiagnosticCategory.Error) {
    return 'error'
  }
  return category === ts.DiagnosticCategory.Warning ? 'warning' : 'info'
}

export function createCodeLanguageService (ts: TypeScript, vue: VueLanguageTools, configPath: string): CodeLanguageService {
  const root = path.dirname(configPath)
  // 未儲存的內容。version 於內容改變時遞增
  const overlays = new Map<string, { text: string, version: number }>()
  // 同一個版本回傳同一個 snapshot，Volar 據此判斷 .vue 檔是否須重新轉換
  const snapshots = new Map<string, { version: string, snapshot: TS.IScriptSnapshot }>()
  let nextVersion = 1
  let fileNames: string[] = []
  let options: TS.CompilerOptions = {}
  let vueOptions: unknown
  let moduleCache: TS.ModuleResolutionCache | undefined

  const refreshFiles = () => {
    // 檔案清單由 TypeScript 解析，含 .vue 檔。Vue 的選項由 Vue 語言工具解析，其檔案清單刻意為空
    const config = ts.readJsonConfigFile(configPath, file => ts.sys.readFile(file))
    const parsed = ts.parseJsonSourceFileConfigFileContent(config, ts.sys, root, {}, configPath, undefined, [
      { extension: 'vue', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred },
    ])
    // .vue 檔須列入專案，由 Volar 提供轉換後的內容。只做檢查，不使用 composite 的檔案清單限制
    options = { ...parsed.options, allowNonTsExtensions: true, composite: false }
    moduleCache = ts.createModuleResolutionCache(root, file => file, options)
    vueOptions = vue.createParsedCommandLine(ts, ts.sys, configPath).vueOptions
    fileNames = parsed.fileNames
  }
  refreshFiles()

  const scriptVersion = (file: string): string => {
    const overlay = overlays.get(file)
    if (overlay) {
      return `draft-${overlay.version}`
    }
    try {
      return String(statSync(file).mtimeMs)
    } catch {
      return 'missing'
    }
  }

  const readText = (file: string): string | undefined => overlays.get(file)?.text ?? ts.sys.readFile(file)

  const scriptSnapshot = (file: string): TS.IScriptSnapshot | undefined => {
    const version = scriptVersion(file)
    const cached = snapshots.get(file)
    if (cached?.version === version) {
      return cached.snapshot
    }
    const text = readText(file)
    if (text === undefined) {
      snapshots.delete(file)
      return undefined
    }
    const snapshot = ts.ScriptSnapshot.fromString(text)
    snapshots.set(file, { version, snapshot })
    return snapshot
  }

  // 副檔名對應的種類。.vue 檔的種類由 Volar 決定
  const scriptKind = (file: string): TS.ScriptKind => {
    if (/\.[cm]?ts$/.test(file)) {
      return ts.ScriptKind.TS
    }
    if (file.endsWith('.tsx')) {
      return ts.ScriptKind.TSX
    }
    if (/\.[cm]?js$/.test(file)) {
      return ts.ScriptKind.JS
    }
    return file.endsWith('.json') ? ts.ScriptKind.JSON : ts.ScriptKind.Unknown
  }

  const moduleHost: TS.ModuleResolutionHost = {
    fileExists: file => overlays.has(file) || ts.sys.fileExists(file),
    readFile: readText,
    directoryExists: directory => ts.sys.directoryExists(directory),
    getDirectories: directory => ts.sys.getDirectories(directory),
    realpath: file => ts.sys.realpath?.(file) ?? file,
  }

  // Volar 包裝的是宿主自己的 resolveModuleNameLiterals 與 getScriptKind，兩者皆須提供
  const host: TS.LanguageServiceHost = {
    fileExists: moduleHost.fileExists,
    readFile: readText,
    directoryExists: moduleHost.directoryExists,
    getDirectories: moduleHost.getDirectories,
    realpath: moduleHost.realpath,
    getCompilationSettings: () => options,
    getScriptKind: scriptKind,
    resolveModuleNameLiterals: (literals, containingFile, redirectedReference, settings, containingSourceFile) => literals.map(literal =>
      ts.resolveModuleName(literal.text, containingFile, settings, moduleHost, moduleCache, redirectedReference, ts.getModeForUsageLocation(containingSourceFile, literal, settings))),
    getScriptFileNames: () => fileNames,
    getScriptVersion: scriptVersion,
    getScriptSnapshot: scriptSnapshot,
    getCurrentDirectory: () => root,
    getDefaultLibFileName: settings => ts.getDefaultLibFilePath(settings),
    readDirectory: (...args) => ts.sys.readDirectory(...args),
  }

  // 與 vue-tsc 相同的 Vue 語言外掛。host 由 Volar 包裝，.vue 檔以轉換後的 TypeScript 提供
  const language = vue.createLanguage(
    [vue.createVueLanguagePlugin(ts, options, vueOptions, id => id), { getLanguageId: vue.resolveFileLanguageId }],
    new vue.FileMap(ts.sys.useCaseSensitiveFileNames),
    file => {
      const snapshot = scriptSnapshot(file)
      if (snapshot) {
        language.scripts.set(file, snapshot)
      } else {
        language.scripts.delete(file)
      }
    },
  )
  vue.decorateLanguageServiceHost(ts, language, host)
  const { initialize, proxy: service } = vue.createProxyLanguageService(ts.createLanguageService(host, ts.createDocumentRegistry()))
  initialize(language)

  // 內容與磁碟上相同時不留未儲存的內容。不在 tsconfig 中的檔案一併加入
  const setText = (file: string, text: string) => {
    if (!fileNames.includes(file)) {
      fileNames = [...fileNames, file]
    }
    if (text === ts.sys.readFile(file)) {
      overlays.delete(file)
    } else if (overlays.get(file)?.text !== text) {
      overlays.set(file, { text, version: nextVersion++ })
    }
  }

  return {
    diagnostics: (file, text) => {
      setText(file, text)
      const diagnostics = [...service.getSyntacticDiagnostics(file), ...service.getSemanticDiagnostics(file)]
      return diagnostics.map(diagnostic => {
        const from = diagnostic.start ?? 0
        return {
          from,
          to: from + (diagnostic.length ?? 0),
          severity: severity(ts, diagnostic.category),
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          code: diagnostic.code,
        }
      })
    },
    completions: (file, text, pos) => {
      setText(file, text)
      const info = service.getCompletionsAtPosition(file, pos, {
        includeCompletionsWithInsertText: true,
        includeCompletionsForModuleExports: false,
      })
      if (!info) {
        return { from: null, entries: [] }
      }
      const entries = info.entries
        .toSorted((a, b) => a.sortText.localeCompare(b.sortText) || a.name.localeCompare(b.name))
        .slice(0, MAX_COMPLETIONS)
        .map(entry => ({
          name: entry.name,
          kind: entry.kind,
          sortText: entry.sortText,
          ...(entry.insertText && entry.insertText !== entry.name ? { insertText: entry.insertText } : {}),
        }))
      return { from: info.optionalReplacementSpan?.start ?? null, entries }
    },
    refreshFiles,
    warmUp: () => {
      service.getProgram()
    },
  }
}
