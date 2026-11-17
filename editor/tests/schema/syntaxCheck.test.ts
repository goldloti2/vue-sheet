import type { TypeScript } from '../../server/vueBuild'
import { beforeAll, describe, expect, it } from 'vitest'
import { checkExpression } from '../../server/schema/syntaxCheck'
import { loadSchemaTestContext } from './setup'

let ts: TypeScript

beforeAll(async () => {
  ({ ts } = await loadSchemaTestContext())
}, 30_000)

describe('checkExpression', () => {
  it('accepts one expression, with comments and line breaks', () => {
    expect(checkExpression(ts, 'row => row.price * 2')).toBeNull()
    expect(checkExpression(ts, 'row => {\n  return row.a // note\n}')).toBeNull()
  })

  it('reports syntax errors', () => {
    expect(checkExpression(ts, 'row => row.')).toBe('Identifier expected.')
    expect(checkExpression(ts, '')).toBe('沒有填寫內容。')
  })

  it('rejects code that closes the parentheses early', () => {
    expect(checkExpression(ts, '1); alert(2')).toBe('只能填寫一個運算式。')
  })
})
