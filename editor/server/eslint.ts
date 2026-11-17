import type { Problem } from '../shared/checks.ts'
import type { ESLint, Linter } from 'eslint'
import path from 'node:path'
import { importFromVueBuild } from './vueBuild.ts'

export interface LintResult {
  /** 修正格式後的內容 */
  text: string
  /** 修正後仍有的問題 */
  problems: Problem[]
}

/** absolute 為絕對路徑 */
export type CodeLinter = (absolute: string, text: string) => Promise<LintResult>

const LINTED_EXTENSIONS = new Set(['.ts', '.vue', '.js', '.mts'])

// ESLint 的訊息轉為問題。filePath 相對於 repo 根目錄
export function eslintProblems (filePath: string, messages: readonly Linter.LintMessage[]): Problem[] {
  return messages.map(message => ({
    source: 'eslint',
    path: filePath,
    position: message.line ? { line: message.line, column: message.column } : null,
    severity: message.severity === 2 ? 'error' : 'warning',
    message: message.message,
    code: message.ruleId,
  }))
}

// 以 vue-build 的 ESLint 設定修正格式並檢查。vue-build 以外的檔案與其他副檔名照原樣回傳，沒有問題
export function createLinter (root: string): CodeLinter {
  const vueBuildRoot = path.join(root, 'vue-build')
  let eslint: Promise<ESLint> | null = null

  return async (absolute, text) => {
    const relative = path.relative(vueBuildRoot, absolute)
    if (relative.startsWith('..') || !LINTED_EXTENSIONS.has(path.extname(absolute))) {
      return { text, problems: [] }
    }

    eslint ??= importFromVueBuild<{ ESLint: typeof ESLint }>(vueBuildRoot, 'eslint')
      .then(module => new module.ESLint({ cwd: vueBuildRoot, fix: true }))
    const [result] = await (await eslint).lintText(text, { filePath: absolute })
    const filePath = path.relative(root, absolute).split(path.sep).join('/')
    return { text: result?.output ?? text, problems: eslintProblems(filePath, result?.messages ?? []) }
  }
}
