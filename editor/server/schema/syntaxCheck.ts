// 自訂程式碼寫回 schema 前的語法檢查。只檢查語法，型別由 language service 檢查
import type { TypeScript } from '../vueBuild.ts'

const PREFIX = 'const __value = (\n'
const SUFFIX = '\n)\n'

/** code 須為一個運算式，例如 row => row.price * 2。沒有錯誤時回傳 null，有錯誤時回傳第一個錯誤的訊息 */
export function checkExpression (ts: TypeScript, code: string): string | null {
  if (code.trim() === '') {
    return '沒有填寫內容。'
  }
  const text = `${PREFIX}${code}${SUFFIX}`
  const { diagnostics = [] } = ts.transpileModule(text, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.Latest } })
  const [first] = diagnostics
  if (first) {
    return ts.flattenDiagnosticMessageText(first.messageText, '\n')
  }
  // 括號提前閉合時，程式碼會變成多個敘述
  const source = ts.createSourceFile('code.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const [statement] = source.statements
  const declaration = statement && ts.isVariableStatement(statement) ? statement.declarationList.declarations[0] : undefined
  const initializer = declaration?.initializer
  const whole = source.statements.length === 1 && initializer && ts.isParenthesizedExpression(initializer)
    && initializer.getStart(source) === PREFIX.length - 2 && initializer.end === text.length - 1
  return whole ? null : '只能填寫一個運算式。'
}
