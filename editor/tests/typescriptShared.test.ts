import { describe, expect, it } from 'vitest'
import { diagnosticsWithin, positionAt } from '../shared/typescript'

describe('positionAt', () => {
  it('counts lines and columns from 1', () => {
    expect(positionAt('ab\ncd', 0)).toEqual({ line: 1, column: 1 })
    expect(positionAt('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
  })
})

describe('diagnosticsWithin', () => {
  it('keeps the diagnostics of a snippet and makes them relative', () => {
    const diagnostic = { severity: 'error' as const, message: 'm', code: 1 }

    expect(diagnosticsWithin([
      { ...diagnostic, from: 2, to: 4 },
      { ...diagnostic, from: 12, to: 20 },
      { ...diagnostic, from: 30, to: 31 },
    ], 10, 5)).toEqual([{ ...diagnostic, from: 2, to: 5 }])
  })
})
