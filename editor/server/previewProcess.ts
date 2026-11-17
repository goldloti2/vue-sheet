// 預覽的子程序：以 vue-build 的 Vite 與 vite.config.mts 啟動 dev server，另加上預覽的橋接
// 此檔由 Node 直接執行：只使用可移除的型別語法，相對路徑的匯入須寫副檔名
import type { PreviewDraftMessage } from './previewDrafts.ts'
import type { Plugin, ViteDevServer } from 'vite'
import type * as Vite from 'vite'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { previewDrafts } from './previewDrafts.ts'

/** 子程序傳給編輯器服務的訊息 */
export type PreviewProcessMessage
  = | { kind: 'ready', url: string }
    | { kind: 'failed', message: string }

const [vueBuildRoot = '', editorRoot = '', mode = 'development', port = ''] = process.argv.slice(2)

const drafts = new Map<string, string>()
let devServer: ViteDevServer | null = null

// 草稿變動時，視同檔案已修改，由 Vite 熱更新。dev server 啟動前收到的草稿於讀檔時套用
process.on('message', (message: PreviewDraftMessage) => {
  if (message.text === null) {
    drafts.delete(message.file)
  } else {
    drafts.set(message.file, message.text)
  }
  devServer?.watcher.emit('change', message.file)
})

// 於 index.html 最前面載入 editor/preview/bridge.ts
function previewBridge (): Plugin {
  const bridge = path.join(editorRoot, 'preview/bridge.ts').split(path.sep).join('/')
  return {
    name: 'editor-preview-bridge',
    transformIndexHtml: () => [
      { tag: 'script', attrs: { type: 'module', src: `/@fs/${bridge.replace(/^\//, '')}` }, injectTo: 'head-prepend' },
    ],
  }
}

// 訊息送出後才回傳
async function send (message: PreviewProcessMessage): Promise<void> {
  await new Promise<void>(resolve => {
    if (process.send) {
      process.send(message, () => resolve())
    } else {
      resolve()
    }
  })
}

try {
  const require = createRequire(path.join(vueBuildRoot, 'package.json'))
  const vite = await import(pathToFileURL(require.resolve('vite')).href) as typeof Vite
  const server = await vite.createServer({
    root: vueBuildRoot,
    configFile: path.join(vueBuildRoot, 'vite.config.mts'),
    mode,
    clearScreen: false,
    plugins: [previewBridge(), previewDrafts(drafts)],
    // 指定 fs.allow 時不再自動允許專案的根目錄，因此 vue-build 須一併列出
    server: { port: Number(port), strictPort: true, fs: { allow: [vueBuildRoot, editorRoot] } },
  })
  await server.listen()
  devServer = server
  await send({ kind: 'ready', url: server.resolvedUrls?.local[0] ?? `http://localhost:${port}/` })
} catch (error) {
  await send({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
  throw error
}
