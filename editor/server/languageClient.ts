import type { CodeCompletions, CodeDiagnostic } from '../shared/typescript.ts'
import type { LanguageWorkerCall, LanguageWorkerData, LanguageWorkerRequest, LanguageWorkerResponse } from './languageWorker.ts'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

export interface LanguageClient {
  /** filePath 為絕對路徑 */
  diagnostics: (filePath: string, text: string) => Promise<CodeDiagnostic[]>
  completions: (filePath: string, text: string, pos: number) => Promise<CodeCompletions>
  refreshFiles: () => Promise<void>
  close: () => Promise<void>
}

// worker 於第一次請求時啟動。worker 結束時，未完成的請求失敗，下一次請求重新啟動
export function createLanguageClient (root: string): LanguageClient {
  const workerData: LanguageWorkerData = { vueBuildRoot: path.join(root, 'vue-build') }
  const workerFile = path.join(root, 'editor/server/languageWorker.ts')
  const pending = new Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>()
  let worker: Worker | null = null
  let nextId = 1

  const failAll = (error: Error) => {
    for (const { reject } of pending.values()) {
      reject(error)
    }
    pending.clear()
  }

  const ensureWorker = (): Worker => {
    if (worker) {
      return worker
    }
    const started = new Worker(workerFile, { workerData })
    started.on('message', (response: LanguageWorkerResponse) => {
      const request = pending.get(response.id)
      pending.delete(response.id)
      if (response.error === undefined) {
        request?.resolve(response.result)
      } else {
        request?.reject(new Error(response.error))
      }
    })
    started.on('error', error => failAll(error))
    started.on('exit', code => {
      if (worker === started) {
        worker = null
      }
      failAll(new Error(`TypeScript 的 worker 已結束（結束代碼 ${code}）`))
    })
    worker = started
    return started
  }

  const request = <T>(call: LanguageWorkerCall) => new Promise<T>((resolve, reject) => {
    const message: LanguageWorkerRequest = { ...call, id: nextId++ }
    pending.set(message.id, { resolve: value => resolve(value as T), reject })
    ensureWorker().postMessage(message)
  })

  ensureWorker()

  return {
    diagnostics: (file, text) => request({ method: 'diagnostics', file, text }),
    completions: (file, text, pos) => request({ method: 'completions', file, text, pos }),
    refreshFiles: () => request({ method: 'refreshFiles' }),
    close: async () => {
      const closing = worker
      worker = null
      await closing?.terminate()
    },
  }
}
