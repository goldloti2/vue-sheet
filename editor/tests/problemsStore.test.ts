import type { Problem } from '../shared/checks'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onServerEvent } from '@/api'
import { mergeProblems, useProblemsStore } from '@/stores/problems'
import { BUILD_EVENT, MAX_BUILD_LINES } from '../shared/checks'

vi.mock('@/api', () => ({
  fetchChecks: vi.fn(),
  onServerEvent: vi.fn(),
  startBuild: vi.fn(),
}))

function problem (source: Problem['source'], path: string | null, line = 1): Problem {
  return { source, path, position: path === null ? null : { line, column: 1 }, severity: 'error', message: `${source} ${path}`, code: null }
}

// 服務經由 websocket 推送事件
function emitServerEvent (event: string, data: unknown): void {
  for (const [name, handler] of vi.mocked(onServerEvent).mock.calls) {
    if (name === event) {
      handler(data)
    }
  }
}

describe('mergeProblems', () => {
  const A = 'vue-build/src/a.ts'
  const B = 'vue-build/src/b.ts'

  it('uses the live check for unsaved files and vue-tsc for the others', () => {
    const merged = mergeProblems({
      live: new Map([[A, [problem('ts', A)]], [B, [problem('ts', B)]]]),
      eslint: [],
      vueTsc: [problem('vue-tsc', A), problem('vue-tsc', B)],
      vite: null,
      dirtyPaths: new Set([A]),
    })

    expect(merged.map(item => `${item.source} ${item.path}`)).toEqual([`ts ${A}`, `vue-tsc ${B}`])
  })

  it('keeps vue-tsc problems of an unsaved file that has no live check yet', () => {
    const merged = mergeProblems({ live: new Map(), eslint: [], vueTsc: [problem('vue-tsc', A)], vite: null, dirtyPaths: new Set([A]) })

    expect(merged).toHaveLength(1)
  })

  it('sorts by path and line, problems without a path last', () => {
    const merged = mergeProblems({
      live: new Map(),
      eslint: [problem('eslint', B, 3), problem('eslint', A, 9)],
      vueTsc: [problem('vue-tsc', null), problem('vue-tsc', B, 1)],
      vite: problem('vite', A, 2),
      dirtyPaths: new Set(),
    })

    expect(merged.map(item => `${item.path}:${item.position?.line}`)).toEqual([`${A}:2`, `${A}:9`, `${B}:1`, `${B}:3`, 'null:undefined'])
  })
})

describe('problems store build', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('clears the output when a build starts and keeps the latest lines', () => {
    const store = useProblemsStore()

    emitServerEvent(BUILD_EVENT, { kind: 'state', state: 'running' })
    for (let index = 0; index <= MAX_BUILD_LINES; index++) {
      emitServerEvent(BUILD_EVENT, { kind: 'output', text: String(index) })
    }
    emitServerEvent(BUILD_EVENT, { kind: 'state', state: 'failed' })

    expect(store.build.state).toBe('failed')
    expect(store.build.lines).toHaveLength(MAX_BUILD_LINES)
    expect(store.build.lines[0]).toBe('1')

    emitServerEvent(BUILD_EVENT, { kind: 'state', state: 'running' })
    expect(store.build.lines).toEqual([])
  })
})
