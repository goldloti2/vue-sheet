import type { ConsoleEntry, PreviewSource, PreviewStatus } from '../shared/preview.ts'
import type { PreviewDraftMessage } from './previewDrafts.ts'
import type { PreviewProcessMessage } from './previewProcess.ts'
import { type ChildProcess, fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

export const PREVIEW_PORT = 3101

const ENV_KEY = 'VITE_APPS_SCRIPT_URL'
const FAKE_ENV_FILE = '.env.fake.local'
const STOP_TIMEOUT = 3000
const KEPT_OUTPUT_LINES = 20

// fake 讀取 .env.fake.local，其他讀取 .env
export function previewMode (source: PreviewSource): string {
  return source === 'fake' ? 'fake' : 'development'
}

// 子程序的環境變數。已存在的環境變數優先於 .env，mock 因此以空字串蓋過 .env 的網址
export function previewEnv (source: PreviewSource, base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, NO_COLOR: '1' }
  if (source === 'mock') {
    env[ENV_KEY] = ''
  } else {
    delete env[ENV_KEY]
  }
  return env
}

// 不能使用的資料來源與原因
export function unavailableSources (vueBuildRoot: string): PreviewStatus['unavailable'] {
  const unavailable: PreviewStatus['unavailable'] = {}
  if (!loadEnv(previewMode('sheet'), vueBuildRoot)[ENV_KEY]) {
    unavailable.sheet = `vue-build/.env 中沒有設定 ${ENV_KEY}。`
  }
  if (!existsSync(path.join(vueBuildRoot, FAKE_ENV_FILE)) || !loadEnv(previewMode('fake'), vueBuildRoot)[ENV_KEY]) {
    unavailable.fake = `找不到 vue-build/${FAKE_ENV_FILE}，或其中沒有設定 ${ENV_KEY}。`
  }
  return unavailable
}

interface PreviewOptions {
  /** repo 的根目錄 */
  root: string
  onStatus: (status: PreviewStatus) => void
  onLog: (entry: ConsoleEntry) => void
}

export interface Preview {
  status: () => PreviewStatus
  /** 以該資料來源重新啟動預覽 */
  start: (source: PreviewSource) => Promise<PreviewStatus>
  /** 預覽改用未儲存的內容。text 為 null 時改回檔案的內容。filePath 為絕對路徑 */
  setDraft: (filePath: string, text: string | null) => void
  /** 清除所有草稿 */
  clearDrafts: () => void
  close: () => Promise<void>
}

// 一次只執行一個子程序。切換資料來源時先停止舊的子程序
export function createPreview ({ root, onStatus, onLog }: PreviewOptions): Preview {
  const vueBuildRoot = path.join(root, 'vue-build')
  const editorRoot = path.join(root, 'editor')
  let status: PreviewStatus = { source: 'mock', state: 'starting', url: null, error: null, unavailable: {} }
  let child: ChildProcess | null = null
  // 子程序重新啟動時再次送出
  const drafts = new Map<string, string>()
  const sendDraft = (target: ChildProcess, filePath: string, text: string | null) => {
    const message: PreviewDraftMessage = { kind: 'draft', file: filePath.split(path.sep).join('/'), text }
    target.send(message)
  }
  let queue: Promise<unknown> = Promise.resolve()

  const update = (patch: Partial<PreviewStatus>) => {
    status = { ...status, ...patch }
    onStatus(status)
  }

  // 停止的子程序先自 child 移除，其結束不再更新狀態
  const stopChild = async () => {
    const stopping = child
    child = null
    if (!stopping || stopping.exitCode !== null) {
      return
    }
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => stopping.kill('SIGKILL'), STOP_TIMEOUT)
      stopping.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      stopping.kill('SIGTERM')
    })
  }

  const startChild = (source: PreviewSource) => {
    update({ source, state: 'starting', url: null, error: null, unavailable: unavailableSources(vueBuildRoot) })
    const started = fork(
      path.join(editorRoot, 'server/previewProcess.ts'),
      [vueBuildRoot, editorRoot, previewMode(source), String(PREVIEW_PORT)],
      { cwd: vueBuildRoot, env: previewEnv(source, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
    )
    child = started
    for (const [filePath, text] of drafts) {
      sendDraft(started, filePath, text)
    }
    const output: string[] = []

    const forward = (level: ConsoleEntry['level']) => (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n').map(text => text.trimEnd()).filter(Boolean)) {
        output.push(line)
        output.splice(0, output.length - KEPT_OUTPUT_LINES)
        onLog({ origin: 'server', level, text: line, time: Date.now() })
      }
    }
    started.stdout?.on('data', forward('info'))
    started.stderr?.on('data', forward('error'))

    started.on('message', (message: PreviewProcessMessage) => {
      if (child !== started) {
        return
      }
      if (message.kind === 'ready') {
        update({ state: 'running', url: message.url })
      } else {
        update({ state: 'error', error: message.message })
      }
    })
    started.on('exit', code => {
      if (child !== started) {
        return
      }
      child = null
      if (status.state !== 'error') {
        update({ state: 'error', error: [`預覽已停止（結束代碼 ${code ?? '無'}）。`, ...output].join('\n') })
      }
    })
  }

  const killOnExit = () => child?.kill('SIGKILL')
  process.once('exit', killOnExit)

  return {
    status: () => ({ ...status, unavailable: unavailableSources(vueBuildRoot) }),
    start: source => {
      const reason = unavailableSources(vueBuildRoot)[source]
      if (reason) {
        return Promise.reject(new Error(reason))
      }
      const run = queue.then(async () => {
        await stopChild()
        startChild(source)
        return status
      })
      queue = run.catch(() => undefined)
      return run
    },
    setDraft: (filePath, text) => {
      if (text === null) {
        drafts.delete(filePath)
      } else {
        drafts.set(filePath, text)
      }
      if (child?.connected) {
        sendDraft(child, filePath, text)
      }
    },
    clearDrafts: () => {
      for (const filePath of drafts.keys()) {
        drafts.delete(filePath)
        if (child?.connected) {
          sendDraft(child, filePath, null)
        }
      }
    },
    close: async () => {
      process.off('exit', killOnExit)
      await queue
      await stopChild()
    },
  }
}
