import type { BuildEvent, BuildStatus, ChecksSnapshot, Problem } from '../shared/checks.ts'
import type { CodeLinter } from './eslint.ts'
import type { Formatter } from './files.ts'
import type { ViteBuild } from './viteBuild.ts'
import type { VueTscWatch } from './vueTsc.ts'
import path from 'node:path'
import { BUILD_EVENT, ESLINT_EVENT, MAX_BUILD_LINES, VUE_TSC_EVENT } from '../shared/checks.ts'
import { hashText } from './files.ts'
import { runViteBuild } from './viteBuild.ts'
import { startVueTscWatch } from './vueTsc.ts'

interface ChecksOptions {
  /** repo 的根目錄 */
  root: string
  lint: CodeLinter
  /** 經由 websocket 推送事件 */
  send: (event: string, data: unknown) => void
  /** 測試以假的 vue-tsc 與建置取代 */
  startVueTsc?: typeof startVueTscWatch
  runBuild?: typeof runViteBuild
}

export interface Checks {
  snapshot: () => ChecksSnapshot
  /** 寫入前修正格式，並記下修正後仍有的 ESLint 問題 */
  format: Formatter
  /** 檔案在別處修改或刪除時，移除不再符合內容的 ESLint 問題。filePath 相對於 repo 根目錄 */
  fileChanged: (filePath: string, hash: string | null) => void
  /** 開始建置。建置中時不重複執行，回傳 false */
  startBuild: () => boolean
  close: () => void
}

// 存檔時的 ESLint、背景的 vue-tsc 與手動的建置
export function createChecks ({ root, lint, send, startVueTsc = startVueTscWatch, runBuild = runViteBuild }: ChecksOptions): Checks {
  // 檔案的路徑對應檢查時的內容 hash 與問題。沒有問題的檔案不列入
  const eslint = new Map<string, { hash: string, problems: Problem[] }>()
  const sendEslint = () => send(ESLINT_EVENT, [...eslint.values()].flatMap(entry => entry.problems))

  const vueTsc: VueTscWatch = startVueTsc({ root, onStatus: status => send(VUE_TSC_EVENT, status) })

  let build: BuildStatus = { state: 'idle', lines: [] }
  let running: ViteBuild | null = null
  const sendBuild = (event: BuildEvent) => send(BUILD_EVENT, event)

  return {
    snapshot: () => ({
      eslint: [...eslint.values()].flatMap(entry => entry.problems),
      vueTsc: vueTsc.status(),
      build,
    }),
    format: async (absolute, text) => {
      const result = await lint(absolute, text)
      const filePath = path.relative(root, absolute).split(path.sep).join('/')
      const had = eslint.has(filePath)
      if (result.problems.length > 0) {
        eslint.set(filePath, { hash: hashText(result.text), problems: result.problems })
      } else {
        eslint.delete(filePath)
      }
      if (had || result.problems.length > 0) {
        sendEslint()
      }
      return result.text
    },
    fileChanged: (filePath, hash) => {
      const entry = eslint.get(filePath)
      if (entry && entry.hash !== hash) {
        eslint.delete(filePath)
        sendEslint()
      }
    },
    startBuild: () => {
      if (running) {
        return false
      }
      build = { state: 'running', lines: [] }
      sendBuild({ kind: 'state', state: 'running' })
      const output = (text: string) => {
        build.lines.push(text)
        build.lines.splice(0, build.lines.length - MAX_BUILD_LINES)
        sendBuild({ kind: 'output', text })
      }
      const finish = (ok: boolean) => {
        running = null
        build = { ...build, state: ok ? 'succeeded' : 'failed' }
        sendBuild({ kind: 'state', state: build.state })
      }
      try {
        const current = runBuild({ root, onOutput: output })
        running = current
        void current.done.then(finish)
      } catch (error) {
        output((error as Error).message)
        finish(false)
      }
      return true
    },
    close: () => {
      vueTsc.close()
      running?.stop()
    },
  }
}
