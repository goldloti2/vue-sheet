import type { Problem, VueTscStatus } from '../shared/checks.ts'
import { type ChildProcess, spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { resolveBin } from './vueBuild.ts'

// 只檢查，不寫檔：不輸出檔案，也不寫 tsbuildinfo。--pretty false 的輸出一行一個問題
const VUE_TSC_ARGS = [
  '-p', 'tsconfig.app.json',
  '--noEmit', '--composite', 'false', '--incremental', 'false',
  '--pretty', 'false', '--preserveWatchOutput', '--watch',
]
const KEPT_OUTPUT_LINES = 20

const CHECK_START = /Starting compilation in watch mode|File change detected/
const CHECK_END = /Found \d+ errors?\. Watching for file changes/
const FILE_DIAGNOSTIC = /^(.+)\((\d+),(\d+)\): (error|warning|message) (TS\d+): (.*)$/
const GLOBAL_DIAGNOSTIC = /^(error|warning|message) (TS\d+): (.*)$/

const SEVERITIES: Record<string, Problem['severity']> = { error: 'error', warning: 'warning', message: 'info' }

/** 每次讀入一行輸出。狀態改變時回傳新的狀態，其他時候回傳 null */
export type TscOutputParser = (line: string) => Pick<VueTscStatus, 'state' | 'problems'> | null

// toPath 把輸出中的路徑轉為問題的路徑。檢查期間保留上一次的問題，檢查結束才換成新的問題
export function createTscOutputParser (toPath: (file: string) => string): TscOutputParser {
  let started = false
  let problems: Problem[] = []
  let collecting: Problem[] = []

  return line => {
    if (CHECK_START.test(line)) {
      collecting = []
      const first = !started
      started = true
      return first ? null : { state: 'checking', problems }
    }
    if (CHECK_END.test(line)) {
      problems = collecting
      return { state: 'done', problems }
    }
    const file = FILE_DIAGNOSTIC.exec(line)
    const global = file ? null : GLOBAL_DIAGNOSTIC.exec(line)
    if (file) {
      const [, filePath = '', lineText = '', columnText = '', severity = '', code = null, message = ''] = file
      collecting.push({ source: 'vue-tsc', path: toPath(filePath), position: { line: Number(lineText), column: Number(columnText) }, severity: SEVERITIES[severity] ?? 'error', message, code })
    } else if (global) {
      const [, severity = '', code = null, message = ''] = global
      collecting.push({ source: 'vue-tsc', path: null, position: null, severity: SEVERITIES[severity] ?? 'error', message, code })
    } else if (/^\s+\S/.test(line) && collecting.length > 0) {
      // 縮排的行接續上一個問題的訊息
      const last = collecting.at(-1)!
      last.message = `${last.message}\n${line.trim()}`
    }
    return null
  }
}

interface VueTscOptions {
  /** repo 的根目錄 */
  root: string
  onStatus: (status: VueTscStatus) => void
}

export interface VueTscWatch {
  status: () => VueTscStatus
  close: () => void
}

// vue-tsc 以 watch 模式於背景常駐，檢查 vue-build/tsconfig.app.json 涵蓋的檔案於磁碟上的內容
export function startVueTscWatch ({ root, onStatus }: VueTscOptions): VueTscWatch {
  const vueBuildRoot = path.join(root, 'vue-build')
  let status: VueTscStatus = { state: 'starting', problems: [], error: null }
  const update = (patch: Partial<VueTscStatus>) => {
    status = { ...status, ...patch }
    onStatus(status)
  }

  // 輸出中的路徑相對於 vue-build。repo 以外的檔案改為絕對路徑
  const toPath = (file: string) => {
    const absolute = path.resolve(vueBuildRoot, file)
    const relative = path.relative(root, absolute)
    return relative.startsWith('..') ? absolute : relative.split(path.sep).join('/')
  }
  const parse = createTscOutputParser(toPath)
  const output: string[] = []
  const keep = (line: string) => {
    output.push(line)
    output.splice(0, output.length - KEPT_OUTPUT_LINES)
  }

  let child: ChildProcess | null = null
  try {
    child = spawn(process.execPath, [resolveBin(vueBuildRoot, 'vue-tsc'), ...VUE_TSC_ARGS], {
      cwd: vueBuildRoot,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    update({ state: 'failed', error: (error as Error).message })
  }
  const started = child

  if (started) {
    createInterface({ input: started.stdout! }).on('line', line => {
      keep(line)
      const next = parse(line)
      if (next) {
        update(next)
      }
    })
    createInterface({ input: started.stderr! }).on('line', keep)
    started.on('error', error => {
      if (child === started) {
        child = null
        update({ state: 'failed', error: error.message })
      }
    })
    started.on('exit', code => {
      if (child === started) {
        child = null
        update({ state: 'failed', error: [`vue-tsc 已停止（結束代碼 ${code ?? '無'}）。`, ...output].join('\n') })
      }
    })
  }

  const kill = () => child?.kill('SIGKILL')
  process.once('exit', kill)

  return {
    status: () => status,
    close: () => {
      process.off('exit', kill)
      const stopping = child
      child = null
      stopping?.kill('SIGTERM')
    },
  }
}
