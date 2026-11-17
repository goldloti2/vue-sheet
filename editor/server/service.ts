import type { FileChangedEvent, ProjectIndex, WriteRequest } from '../shared/api.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import path from 'node:path'
import { watch } from 'chokidar'
import { FILE_CHANGED_EVENT, PROJECT_INDEX_EVENT } from '../shared/api.ts'
import { PREVIEW_LOG_EVENT, PREVIEW_STATUS_EVENT, type PreviewDraft, type PreviewSource } from '../shared/preview.ts'
import { tableKeyOf } from '../shared/tableKeys.ts'
import { type CodeRequest, type CompletionRequest, hasTypeScriptService } from '../shared/typescript.ts'
import { hashText, readProjectFile, writeProjectFile } from './files.ts'
import { createLanguageClient, type LanguageClient } from './languageClient.ts'
import { createPreview } from './preview.ts'
import { absolutePath, isProjectFile, listProjectFiles, PROJECT_DIRS, ScopeError } from './projectFiles.ts'
import { readTableLabels } from './tableLabels.ts'
import { createFormatter, loadTypeScript } from './vueBuild.ts'

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

async function readProjectIndex (root: string): Promise<ProjectIndex> {
  const paths = await listProjectFiles(root)
  const ts = await loadTypeScript(path.join(root, 'vue-build'))
  return { paths, tableLabels: await readTableLabels(ts, root, paths) }
}

function watchProjectFiles (root: string, server: ViteDevServer, language: LanguageClient): void {
  const watcher = watch(PROJECT_DIRS.map(dir => path.join(root, dir)), { ignoreInitial: true })
  const toProjectPath = (absolute: string) => path.relative(root, absolute).split(path.sep).join('/')

  const notifyChange = async (absolute: string, removed: boolean) => {
    const filePath = toProjectPath(absolute)
    if (!isProjectFile(filePath)) {
      return
    }
    const file = removed ? null : await readProjectFile(root, filePath)
    const event: FileChangedEvent = { path: filePath, hash: file ? hashText(file.text) : null }
    server.ws.send(FILE_CHANGED_EVENT, event)
  }
  const notifyIndex = async () => {
    server.ws.send(PROJECT_INDEX_EVENT, await readProjectIndex(root))
  }

  // 新增或刪除檔案、修改表的 schema 時，重送檔案清單與表名
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

// 編輯器的服務：/api/ 的讀寫，以及經由 Vite 的 websocket 推送檔案的變動
export function editorService ({ root }: ServiceOptions): Plugin {
  const format = createFormatter(path.join(root, 'vue-build'))

  return {
    name: 'editor-service',
    configureServer (server) {
      const language = createLanguageClient(root)
      server.httpServer?.once('close', () => void language.close())
      watchProjectFiles(root, server, language)

      const preview = createPreview({
        root,
        onStatus: status => server.ws.send(PREVIEW_STATUS_EVENT, status),
        onLog: entry => server.ws.send(PREVIEW_LOG_EVENT, entry),
      })
      void preview.start('mock')
      server.httpServer?.once('close', () => void preview.close())

      server.middlewares.use('/api/', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          if (url.pathname === '/project' && req.method === 'GET') {
            sendJson(res, 200, await readProjectIndex(root))
          } else if (url.pathname === '/file' && req.method === 'GET') {
            const file = await readProjectFile(root, url.searchParams.get('path') ?? '')
            sendJson(res, file ? 200 : 404, file)
          } else if (url.pathname === '/file' && req.method === 'PUT') {
            const body = JSON.parse(await readBody(req)) as WriteRequest
            sendJson(res, 200, await writeProjectFile(root, body.path, body.text, body.baseHash, format))
          } else if (url.pathname === '/ts/diagnostics' && req.method === 'POST') {
            const body = JSON.parse(await readBody(req)) as CodeRequest
            const file = absolutePath(root, body.path)
            sendJson(res, 200, hasTypeScriptService(body.path) ? await language.diagnostics(file, body.text) : [])
          } else if (url.pathname === '/ts/completions' && req.method === 'POST') {
            const body = JSON.parse(await readBody(req)) as CompletionRequest
            const file = absolutePath(root, body.path)
            sendJson(res, 200, hasTypeScriptService(body.path) ? await language.completions(file, body.text, body.pos) : { from: null, entries: [] })
          } else if (url.pathname === '/preview' && req.method === 'GET') {
            sendJson(res, 200, preview.status())
          } else if (url.pathname === '/preview' && req.method === 'PUT') {
            const body = JSON.parse(await readBody(req)) as { source: PreviewSource }
            sendJson(res, 200, await preview.start(body.source))
          } else if (url.pathname === '/preview/draft' && req.method === 'PUT') {
            const body = JSON.parse(await readBody(req)) as PreviewDraft
            preview.setDraft(absolutePath(root, body.path), body.text)
            sendJson(res, 200, {})
          } else if (url.pathname === '/preview/drafts' && req.method === 'DELETE') {
            preview.clearDrafts()
            sendJson(res, 200, {})
          } else {
            sendJson(res, 404, { message: '沒有這個 API' })
          }
        } catch (error) {
          sendJson(res, error instanceof ScopeError ? 403 : 500, { message: (error as Error).message })
        }
      })
    },
  }
}
