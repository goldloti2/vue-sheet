import type { FileChangedEvent, ProjectIndex, WriteRequest } from '../shared/api'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import path from 'node:path'
import { watch } from 'chokidar'
import { FILE_CHANGED_EVENT, PROJECT_INDEX_EVENT } from '../shared/api'
import { tableKeyOf } from '../shared/tableKeys'
import { hashText, readProjectFile, writeProjectFile } from './files'
import { isProjectFile, listProjectFiles, PROJECT_DIRS, ScopeError } from './projectFiles'
import { readTableLabels } from './tableLabels'
import { createFormatter, loadTypeScript } from './vueBuild'

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

function watchProjectFiles (root: string, server: ViteDevServer): void {
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
  })
  watcher.on('unlink', absolute => {
    void notifyChange(absolute, true)
    void notifyIndex()
  })
  server.httpServer?.once('close', () => void watcher.close())
}

// 編輯器的服務：/api/ 的讀寫，以及經由 Vite 的 websocket 推送檔案的變動
export function editorService ({ root }: ServiceOptions): Plugin {
  const format = createFormatter(path.join(root, 'vue-build'))

  return {
    name: 'editor-service',
    configureServer (server) {
      watchProjectFiles(root, server)

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
