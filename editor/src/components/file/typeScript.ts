import type { CodeCompletionEntry } from '../../../shared/typescript'
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'
import { type Diagnostic, linter, lintGutter } from '@codemirror/lint'
import { fetchCompletions, fetchDiagnostics } from '@/api'
import { useProblemsStore } from '@/stores/problems'

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

// 檢查與補全以編輯中的內容為準，可能尚未儲存。extension 只依賴路徑，可隨保留的 EditorState 換到另一個元件實例
// 檢查的結果同時列於問題分頁
export function typeScriptExtensions (path: string): Extension {
  const lint = linter(async view => {
    const { doc } = view.state
    const diagnostics = await fetchDiagnostics({ path, text: doc.toString() }).catch(() => null)
    if (!diagnostics) {
      return []
    }
    const clamped = diagnostics.map(diagnostic => ({
      ...diagnostic,
      from: Math.min(diagnostic.from, doc.length),
      to: Math.min(diagnostic.to, doc.length),
    }))
    useProblemsStore().setLive(path, clamped.map(diagnostic => {
      const line = doc.lineAt(diagnostic.from)
      return {
        source: 'ts',
        path,
        position: { line: line.number, column: diagnostic.from - line.from + 1 },
        severity: diagnostic.severity,
        message: diagnostic.message,
        code: `TS${diagnostic.code}`,
      }
    }))
    return clamped.map((diagnostic): Diagnostic => ({
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
    if (!context.explicit && (!word || word.from === word.to) && !TRIGGER.test(before)) {
      return null
    }
    const controller = new AbortController()
    context.addEventListener('abort', () => controller.abort())
    const result = await fetchCompletions({ path, text: context.state.doc.toString(), pos: context.pos }, controller.signal)
      .catch(() => null)
    if (!result || result.entries.length === 0) {
      return null
    }
    return {
      from: result.from ?? word?.from ?? context.pos,
      options: result.entries.map(entry => completionOption(entry)),
      validFor: /^[\w$]*$/,
    }
  }

  return [lint, lintGutter(), autocompletion({ override: [complete] })]
}
