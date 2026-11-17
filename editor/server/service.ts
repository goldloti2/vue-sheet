import type { FileChangedEvent, ProjectIndex, WriteRequest } from '../shared/api.ts'
import type { CodeContextRequest, SchemaEditRequest, SchemaEditResult, SchemaTypes } from '../shared/schema.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { watch } from 'chokidar'
import { FILE_CHANGED_EVENT, PROJECT_INDEX_EVENT } from '../shared/api.ts'
import { PREVIEW_LOG_EVENT, PREVIEW_STATUS_EVENT, type PreviewDraft, type PreviewSource } from '../shared/preview.ts'
import { tableKeyOf } from '../shared/tableKeys.ts'
import { type CodeRequest, type CompletionRequest, hasTypeScriptService } from '../shared/typescript.ts'
import { type Checks, createChecks } from './checks.ts'
import { createLinter } from './eslint.ts'
import { hashText, readProjectFile, writeProjectFile } from './files.ts'
import { createLanguageClient, type LanguageClient } from './languageClient.ts'
import { createPreview } from './preview.ts'
import { absolutePath, isProjectFile, listProjectFiles, PROJECT_DIRS, ScopeError } from './projectFiles.ts'
import { readSchemaTypes } from './schema/columnTypes.ts'
import { SchemaEditError } from './schema/schemaEdits.ts'
import { parseSchema } from './schema/schemaModel.ts'
import { applySchemaEdits, codeContext } from './schema/schemaService.ts'
import { readTableSummaries } from './tableSummaries.ts'
import { loadTypeScript } from './vueBuild.ts'

interface ServiceOptions {
  /** repo 的根目錄 */
  root: string
}

async function readBody (req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson (res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

// 框架的檔案，只讀取
const TYPES_FILE = 'vue-build/src/schema/types.ts'
const COLORS_FILE = 'vue-build/src/plugins/colors.ts'

// 共用色名的色值。以 Node 直接執行框架的檔案，與 vue-build 使用同一份定義
async function readColors (root: string): Promise<SchemaTypes['colors']> {
  const module = await import(pathToFileURL(path.join(root, COLORS_FILE)).href) as { lightColors: Record<string, string>, darkColors: Record<string, string> }
  return { light: module.lightColors, dark: module.darkColors }
}

async function readTypes (root: string, ts: Awaited<ReturnType<typeof loadTypeScript>>) {
  return readSchemaTypes(ts, await readFile(path.join(root, TYPES_FILE), 'utf8'), await readColors(root))
}

async function readProjectIndex (root: string): Promise<ProjectIndex> {
  const paths = await listProjectFiles(root)
  const ts = await loadTypeScript(path.join(root, 'vue-build'))
  return { paths, tables: await readTableSummaries(ts, root, paths) }
}

function watchProjectFiles (root: string, server: ViteDevServer, language: LanguageClient, checks: Checks): void {
  const watcher = watch(PROJECT_DIRS.map(dir => path.join(root, dir)), { ignoreInitial: true })
  const toProjectPath = (absolute: string) => path.relative(root, absolute).split(path.sep).join('/')

  const notifyChange = async (absolute: string, removed: boolean) => {
    const filePath = toProjectPath(absolute)
    if (!isProjectFile(filePath)) {
      return
    }
    const file = removed ? null : await readProjectFile(root, filePath)
    const event: FileChangedEvent = { path: filePath, hash: file ? hashText(file.text) : null }
    checks.fileChanged(event.path, event.hash)
    server.ws.send(FILE_CHANGED_EVENT, event)
  }
  const notifyIndex = async () => {
    server.ws.send(PROJECT_INDEX_EVENT, await readProjectIndex(root))
  }

  // 新增或刪除檔案、修改表的 schema 時，重送檔案清單與各表的摘要
  watcher.on('change', absolute => {
    void notifyChange(absolute, false)
    if (tableKeyOf(toProjectPath(absolute)) !== null) {
      void notifyIndex()
    }
  })
  watcher.on('add', absolute => {
    void notifyChange(absolute, false)
    void notifyIndex()
    void language.refreshFiles().catch(() => undefined)
  })
  watcher.on('unlink', absolute => {
    void notifyChange(absolute, true)
    void notifyIndex()
    void language.refreshFiles().catch(() => undefined)
  })
  server.httpServer?.once('close', () => void watcher.close())
}

// 編輯器的服務：/api/ 的讀寫，以及經由 Vite 的 websocket 推送檔案的變動與檢查的結果
export function editorService ({ root }: ServiceOptions): Plugin {
  return {
    name: 'editor-service',
    configureServer (server) {
      const vueBuildRoot = path.join(root, 'vue-build')
      const language = createLanguageClient(root)
      server.httpServer?.once('close', () => void language.close())
      const checks = createChecks({ root, lint: createLinter(root), send: (event, data) => server.ws.send(event, data) })
      server.httpServer?.once('close', () => checks.close())
      watchProjectFiles(root, server, language, checks)

      const preview = createPreview({
        root,
        onStatus: status => server.ws.send(PREVIEW_STATUS_EVENT, status),
        onLog: entry => server.ws.send(PREVIEW_LOG_EVENT, entry),
      })
      void preview.start('mock')
      server.httpServer?.once('close', () => void preview.close())

      // 方法與路徑對應處理函數。回傳 [狀態碼, 內容]
      const json = async <T>(req: IncomingMessage) => JSON.parse(await readBody(req)) as T
      const routes: Record<string, (req: IncomingMessage, url: URL) => Promise<[number, unknown]>> = {
        'GET /project': async () => [200, await readProjectIndex(root)],
        'GET /file': async (_req, url) => {
          const file = await readProjectFile(root, url.searchParams.get('path') ?? '')
          return [file ? 200 : 404, file]
        },
        'PUT /file': async req => {
          const body = await json<WriteRequest>(req)
          return [200, await writeProjectFile(root, body.path, body.text, body.baseHash, checks.format)]
        },
        'POST /ts/diagnostics': async req => {
          const body = await json<CodeRequest>(req)
          const file = absolutePath(root, body.path)
          return [200, hasTypeScriptService(body.path) ? await language.diagnostics(file, body.text) : []]
        },
        'POST /ts/completions': async req => {
          const body = await json<CompletionRequest>(req)
          const file = absolutePath(root, body.path)
          return [200, hasTypeScriptService(body.path) ? await language.completions(file, body.text, body.pos) : { from: null, entries: [] }]
        },
        'GET /schema/types': async () => [200, await readTypes(root, await loadTypeScript(vueBuildRoot))],
        'POST /schema/parse': async req => [200, parseSchema(await loadTypeScript(vueBuildRoot), (await json<{ text: string }>(req)).text)],
        'POST /schema/edit': async req => {
          const body = await json<SchemaEditRequest>(req)
          const ts = await loadTypeScript(vueBuildRoot)
          const text = applySchemaEdits(ts, body.text, body.edits, (await readTypes(root, ts)).columnTypes)
          const result: SchemaEditResult = { text, model: parseSchema(ts, text) }
          return [200, result]
        },
        'POST /schema/context': async req => {
          const body = await json<CodeContextRequest>(req)
          return [200, codeContext(await loadTypeScript(vueBuildRoot), body.text, body.objectPath, body.name)]
        },
        // 全部的 mdi 圖示：變數名對應 SVG 的 path
        // 只回傳圖示，不含模組的 default 與 __esModule
        'GET /icons': async () => [200, Object.fromEntries(Object.entries(await import('@mdi/js')).filter(([name]) => name.startsWith('mdi')))],
        'GET /checks': async () => [200, checks.snapshot()],
        'POST /build': async () => checks.startBuild() ? [200, {}] : [409, { message: '建置正在執行。' }],
        'GET /preview': async () => [200, preview.status()],
        'PUT /preview': async req => [200, await preview.start((await json<{ source: PreviewSource }>(req)).source)],
        'PUT /preview/draft': async req => {
          const body = await json<PreviewDraft>(req)
          preview.setDraft(absolutePath(root, body.path), body.text)
          return [200, {}]
        },
        'DELETE /preview/drafts': async () => {
          preview.clearDrafts()
          return [200, {}]
        },
      }

      server.middlewares.use('/api/', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = routes[`${req.method} ${url.pathname}`]
        try {
          const [status, body] = route ? await route(req, url) : [404, { message: '沒有這個 API' }]
          sendJson(res, status, body)
        } catch (error) {
          const status = error instanceof ScopeError ? 403 : (error instanceof SchemaEditError ? 400 : 500)
          sendJson(res, status, { message: (error as Error).message })
        }
      })
    },
  }
}
