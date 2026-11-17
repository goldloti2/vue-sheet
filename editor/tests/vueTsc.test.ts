import { describe, expect, it } from 'vitest'
import { createTscOutputParser } from '../server/vueTsc'

// vue-tsc --watch --pretty false 的輸出
const FIRST_CHECK = [
  '',
  '2:02:13 PM - Starting compilation in watch mode...',
  '',
  'src/B.vue(2,7): error TS2322: Type \'string\' is not assignable to type \'number\'.',
  'src/a.ts(2,7): error TS2322: Type \'{ a: number; }\' is not assignable to type \'string\'.',
  '  Object literal may only specify known properties.',
  'error TS5023: Unknown compiler option \'x\'.',
  '',
  '2:02:23 PM - Found 3 errors. Watching for file changes.',
]

describe('createTscOutputParser', () => {
  const parse = () => createTscOutputParser(file => `vue-build/${file}`)

  it('reports the problems when a check ends', () => {
    const push = parse()
    const updates = FIRST_CHECK.map(line => push(line)).filter(Boolean)

    expect(updates).toEqual([{
      state: 'done',
      problems: [
        { source: 'vue-tsc', path: 'vue-build/src/B.vue', position: { line: 2, column: 7 }, severity: 'error', message: 'Type \'string\' is not assignable to type \'number\'.', code: 'TS2322' },
        { source: 'vue-tsc', path: 'vue-build/src/a.ts', position: { line: 2, column: 7 }, severity: 'error', message: 'Type \'{ a: number; }\' is not assignable to type \'string\'.\nObject literal may only specify known properties.', code: 'TS2322' },
        { source: 'vue-tsc', path: null, position: null, severity: 'error', message: 'Unknown compiler option \'x\'.', code: 'TS5023' },
      ],
    }])
  })

  it('keeps the previous problems while checking again', () => {
    const push = parse()
    for (const line of FIRST_CHECK) {
      push(line)
    }

    const checking = push('2:03:00 PM - File change detected. Starting incremental compilation...')
    expect(checking?.state).toBe('checking')
    expect(checking?.problems).toHaveLength(3)

    expect(push('2:03:01 PM - Found 0 errors. Watching for file changes.')).toEqual({ state: 'done', problems: [] })
  })
})
