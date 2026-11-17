import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createLinter, eslintProblems } from '../server/eslint'

// 只讀取 vue-build 的 ESLint 設定。lintText 不讀寫 filePath 指向的檔案
const root = fileURLToPath(new URL('../..', import.meta.url))
const TEST_FILE = 'vue-build/src/schema/tables/__editor_format_test__.ts'

describe('createLinter', () => {
  const lint = createLinter(root)

  it('fixes the format with the vue-build ESLint config', async () => {
    const result = await lint(path.join(root, TEST_FILE), 'export const a = {b: "c"};\n')

    expect(result).toEqual({ text: 'export const a = { b: \'c\' }\n', problems: [] })
  }, 30_000)

  it('reports the problems left after the fix', async () => {
    const result = await lint(path.join(root, TEST_FILE), 'let x = 1\nx = x;\nexport const y = typeof x\n')

    expect(result.text).toBe('let x = 1\nx = x\nexport const y = typeof x\n')
    expect(result.problems).toEqual([
      { source: 'eslint', path: TEST_FILE, position: { line: 2, column: 5 }, severity: 'error', message: expect.any(String), code: 'no-self-assign' },
    ])
  }, 30_000)

  it('keeps files outside vue-build and other extensions as they are', async () => {
    expect(await lint(path.join(root, 'apps-script/Config.gs'), 'const a = {b: "c"};')).toEqual({ text: 'const a = {b: "c"};', problems: [] })
    expect(await lint(path.join(root, 'vue-build/mock/x.csv'), 'a,b')).toEqual({ text: 'a,b', problems: [] })
  })
})

describe('eslintProblems', () => {
  it('maps the severity and keeps messages without a position', () => {
    expect(eslintProblems('a.ts', [
      { line: 3, column: 2, severity: 1, message: 'warn', ruleId: 'rule-a' },
      { line: 0, column: 0, severity: 2, message: 'fatal', ruleId: null },
    ])).toEqual([
      { source: 'eslint', path: 'a.ts', position: { line: 3, column: 2 }, severity: 'warning', message: 'warn', code: 'rule-a' },
      { source: 'eslint', path: 'a.ts', position: null, severity: 'error', message: 'fatal', code: null },
    ])
  })
})
