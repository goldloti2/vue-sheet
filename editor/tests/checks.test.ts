import type { ViteBuild } from '../server/viteBuild'
import type { VueTscWatch } from '../server/vueTsc'
import type { Problem, VueTscStatus } from '../shared/checks'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createChecks } from '../server/checks'
import { hashText } from '../server/files'
import { BUILD_EVENT, ESLINT_EVENT } from '../shared/checks'

const ROOT = path.join(path.sep, 'repo')
const FILE = 'vue-build/src/schema/tables/order.ts'
const PROBLEM: Problem = { source: 'eslint', path: FILE, position: { line: 1, column: 1 }, severity: 'error', message: 'm', code: 'rule' }

// 假的 vue-tsc 與建置，不啟動子程序
function setup (problems: Problem[] = [PROBLEM]) {
  const send = vi.fn()
  let finishBuild: (ok: boolean) => void = () => undefined
  let output: (text: string) => void = () => undefined
  const status: VueTscStatus = { state: 'starting', problems: [], error: null }
  const checks = createChecks({
    root: ROOT,
    lint: async (_absolute, text) => ({ text: `${text}!`, problems }),
    send,
    startVueTsc: (): VueTscWatch => ({ status: () => status, close: vi.fn() }),
    runBuild: ({ onOutput }): ViteBuild => {
      output = onOutput
      return { done: new Promise(resolve => (finishBuild = resolve)), stop: vi.fn() }
    },
  })
  return { checks, send, output: (text: string) => output(text), finishBuild: (ok: boolean) => finishBuild(ok) }
}

describe('createChecks', () => {
  it('records the ESLint problems of the formatted text', async () => {
    const { checks, send } = setup()

    expect(await checks.format(path.join(ROOT, FILE), 'a')).toBe('a!')
    expect(send).toHaveBeenCalledWith(ESLINT_EVENT, [PROBLEM])
    expect(checks.snapshot().eslint).toEqual([PROBLEM])
  })

  it('drops the problems when the file changes elsewhere', async () => {
    const { checks, send } = setup()
    await checks.format(path.join(ROOT, FILE), 'a')
    send.mockClear()

    checks.fileChanged(FILE, hashText('a!'))
    expect(send).not.toHaveBeenCalled()

    checks.fileChanged(FILE, hashText('b'))
    expect(send).toHaveBeenCalledWith(ESLINT_EVENT, [])
    expect(checks.snapshot().eslint).toEqual([])
  })

  it('does not send anything for a file that stays clean', async () => {
    const { checks, send } = setup([])

    await checks.format(path.join(ROOT, FILE), 'a')
    expect(send).not.toHaveBeenCalled()
  })

  it('runs one build at a time and streams its output', async () => {
    const { checks, send, output, finishBuild } = setup()

    expect(checks.startBuild()).toBe(true)
    expect(checks.startBuild()).toBe(false)
    output('built')
    finishBuild(true)
    await vi.waitFor(() => expect(checks.snapshot().build).toEqual({ state: 'succeeded', lines: ['built'] }))

    expect(send.mock.calls.filter(([event]) => event === BUILD_EVENT).map(([, data]) => data)).toEqual([
      { kind: 'state', state: 'running' },
      { kind: 'output', text: 'built' },
      { kind: 'state', state: 'succeeded' },
    ])
    expect(checks.startBuild()).toBe(true)
  })
})
