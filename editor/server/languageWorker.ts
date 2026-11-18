import type { DraftFile } from '../shared/typescript.ts'
import path from 'node:path'
// language service 的 worker：型別檢查不佔用編輯器服務的執行緒
// 此檔由 Node 直接執行：只使用可移除的型別語法，相對路徑的匯入須寫副檔名
import { parentPort, workerData } from 'node:worker_threads'
import { createCodeLanguageService } from './languageService.ts'
import { loadTypeScript, loadVueLanguageTools } from './vueBuild.ts'

export type LanguageWorkerCall
  = | { method: 'diagnostics', file: string, text: string }
    | { method: 'completions', file: string, text: string, pos: number }
    | { method: 'rename', file: string, text: string, pos: number, newName: string, drafts: DraftFile[] }
    | { method: 'refreshFiles' }

export type LanguageWorkerRequest = LanguageWorkerCall & { id: number }

export interface LanguageWorkerResponse {
  id: number
  result?: unknown
  error?: string
}

export interface LanguageWorkerData {
  vueBuildRoot: string
}

const { vueBuildRoot } = workerData as LanguageWorkerData
const [ts, vue] = await Promise.all([loadTypeScript(vueBuildRoot), loadVueLanguageTools(vueBuildRoot)])
const service = createCodeLanguageService(ts, vue, path.join(vueBuildRoot, 'tsconfig.app.json'))

// 收到的請求依序處理。listener 加上之前收到的請求由 MessagePort 保留
parentPort?.on('message', (request: LanguageWorkerRequest) => {
  let response: LanguageWorkerResponse
  try {
    switch (request.method) {
      case 'diagnostics': {
        response = { id: request.id, result: service.diagnostics(request.file, request.text) }
        break
      }
      case 'completions': {
        response = { id: request.id, result: service.completions(request.file, request.text, request.pos) }
        break
      }
      case 'rename': {
        response = { id: request.id, result: service.rename(request.file, request.text, request.pos, request.newName, request.drafts) }
        break
      }
      case 'refreshFiles': {
        service.refreshFiles()
        response = { id: request.id }
        break
      }
    }
  } catch (error) {
    response = { id: request.id, error: error instanceof Error ? error.message : String(error) }
  }
  parentPort?.postMessage(response)
})

service.warmUp()
