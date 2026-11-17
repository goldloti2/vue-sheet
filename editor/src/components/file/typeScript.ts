import type { Problem } from '../../../shared/checks'
import type { CodeCompletionEntry, CodeDiagnostic } from '../../../shared/typescript'
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'
import { type Diagnostic, linter, lintGutter } from '@codemirror/lint'
import { fetchCompletions, fetchDiagnostics } from '@/api'
import { useProblemsStore } from '@/stores/problems'
import { diagnosticsWithin, positionAt } from '../../../shared/typescript'

// 停止輸入此毫秒數後才檢查
const LINT_DELAY = 500

// TypeScript 的 ScriptElementKind 對應 CodeMirror 補全項目的圖示
const COMPLETION_TYPES: Record<string, string> = {
  'keyword': 'keyword',
  'function': 'function',
  'local function': 'function',
  'method': 'method',
  'property': 'property',
  'getter': 'property',
  'setter': 'property',
  'var': 'variable',
  'let': 'variable',
  'const': 'constant',
  'local var': 'variable',
  'parameter': 'variable',
  'class': 'class',
  'interface': 'interface',
  'type': 'type',
  'alias': 'type',
  'enum': 'enum',
  'enum member': 'enum',
  'module': 'namespace',
  'string': 'text',
}

function completionOption (entry: CodeCompletionEntry) {
  return {
    label: entry.name,
    type: COMPLETION_TYPES[entry.kind] ?? 'variable',
    // TypeScript 的 sortText 越小越前面
    boost: -Math.min(99, Number.parseInt(entry.sortText, 10) || 0),
    ...(entry.insertText ? { apply: entry.insertText } : {}),
  }
}

// 只在輸入識別字、點、引號或斜線之後，或以 Ctrl+Space 要求時才查詢
const TRIGGER = /[.'"`/]$/

/** 編輯中的內容在整個檔案中的位置。prefix 與 suffix 之間即為編輯中的內容 */
export interface CodeSurroundings {
  prefix: string
  suffix: string
}

interface CodeIntelligence {
  path: string
  /** 回傳 null 時不檢查也不補全 */
  surroundings: () => CodeSurroundings | null
  /** 收到整個檔案的診斷 */
  onFileDiagnostics?: (text: string, diagnostics: CodeDiagnostic[]) => void
  /** 行號左側的錯誤標記 */
  gutter: boolean
}

// 檢查與補全以編輯中的內容為準，可能尚未儲存。編輯中的內容可為檔案的一段，診斷與補全的位置對應回這一段
function codeIntelligence ({ path, surroundings, onFileDiagnostics, gutter }: CodeIntelligence): Extension {
  const lint = linter(async view => {
    const { doc } = view.state
    const around = surroundings()
    if (!around) {
      return []
    }
    const text = `${around.prefix}${doc.toString()}${around.suffix}`
    const diagnostics = await fetchDiagnostics({ path, text }).catch(() => null)
    if (!diagnostics) {
      return []
    }
    onFileDiagnostics?.(text, diagnostics)
    return diagnosticsWithin(diagnostics, around.prefix.length, doc.length).map((diagnostic): Diagnostic => ({
      from: diagnostic.from,
      to: diagnostic.to,
      severity: diagnostic.severity,
      message: diagnostic.message,
      source: `TS${diagnostic.code}`,
    }))
  }, { delay: LINT_DELAY })

  const complete = async (context: CompletionContext): Promise<CompletionResult | null> => {
    const word = context.matchBefore(/[\w$]*/)
    const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos)
    const around = surroundings()
    if (!around || (!context.explicit && (!word || word.from === word.to) && !TRIGGER.test(before))) {
      return null
    }
    const controller = new AbortController()
    context.addEventListener('abort', () => controller.abort())
    const offset = around.prefix.length
    const text = `${around.prefix}${context.state.doc.toString()}${around.suffix}`
    const result = await fetchCompletions({ path, text, pos: context.pos + offset }, controller.signal).catch(() => null)
    if (!result || result.entries.length === 0) {
      return null
    }
    return {
      from: result.from === null ? word?.from ?? context.pos : result.from - offset,
      options: result.entries.map(entry => completionOption(entry)),
      validFor: /^[\w$]*$/,
    }
  }

  return [lint, gutter ? lintGutter() : [], autocompletion({ override: [complete] })]
}

const WHOLE_FILE: CodeSurroundings = { prefix: '', suffix: '' }

// 整個檔案。extension 只依賴路徑，可隨保留的 EditorState 換到另一個元件實例。檢查的結果同時列於問題分頁
export function typeScriptExtensions (path: string): Extension {
  return codeIntelligence({
    path,
    surroundings: () => WHOLE_FILE,
    onFileDiagnostics: (text, diagnostics) => useProblemsStore().setLive(path, liveProblems(path, text, diagnostics)),
    gutter: true,
  })
}

// 檔案中的一段，例如表單的程式碼輸入框。沒有行號，因此也沒有錯誤標記
export function snippetExtensions (path: string, surroundings: () => CodeSurroundings | null): Extension {
  return codeIntelligence({ path, surroundings, gutter: false })
}

// 即時檢查的診斷轉為問題分頁的問題
export function liveProblems (path: string, text: string, diagnostics: readonly CodeDiagnostic[]): Problem[] {
  return diagnostics.map(diagnostic => ({
    source: 'ts',
    path,
    position: positionAt(text, Math.min(diagnostic.from, text.length)),
    severity: diagnostic.severity,
    message: diagnostic.message,
    code: `TS${diagnostic.code}`,
  }))
}
