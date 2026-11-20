// 預覽頁面的橋接：預覽的 dev server 把此檔注入 index.html
// 把 console 的警告與錯誤、未捕捉的錯誤轉送至控制台，Vite 的錯誤轉送至問題分頁，並接收重新整理的指令

import type { Problem } from '../shared/checks'
import type { ConsoleEntry, PreviewCommand, PreviewPageMessage } from '../shared/preview'
import { PREVIEW_MESSAGE_TAG } from '../shared/preview'

// 此檔的網址為 /@fs/<repo>/editor/preview/bridge.ts，由此取得 repo 的根目錄
const repoRoot = decodeURIComponent(new URL(import.meta.url).pathname)
  .replace(/^\/@fs/, '')
  .replace(/\/editor\/preview\/bridge\.ts$/, '')

function format (value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Error) {
    return value.stack ?? value.message
  }
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function post (message: PreviewPageMessage): void {
  if (window.parent !== window) {
    window.parent.postMessage(message, '*')
  }
}

function send (level: ConsoleEntry['level'], values: unknown[]): void {
  post({ tag: PREVIEW_MESSAGE_TAG, kind: 'console', level, text: values.map(value => format(value)).join(' ') })
}

// repo 中的檔案改為相對路徑。去掉網址的查詢字串
function problemPath (file: string | undefined): string | null {
  if (!file) {
    return null
  }
  const clean = file.replace(/\?.*$/, '')
  return clean.startsWith(`${repoRoot}/`) ? clean.slice(repoRoot.length + 1) : clean
}

for (const level of ['warn', 'error'] as const) {
  const original = console[level].bind(console)
  console[level] = (...values: unknown[]) => {
    original(...values)
    send(level, values)
  }
}

// ResizeObserver 延後通知的提示不轉送
const RESIZE_OBSERVER_NOTICE = /^ResizeObserver loop/

window.addEventListener('error', event => {
  if (!event.error && RESIZE_OBSERVER_NOTICE.test(event.message)) {
    return
  }
  send('error', [event.error ?? event.message])
})
window.addEventListener('unhandledrejection', event => send('error', ['未處理的 Promise 錯誤：', event.reason]))

import.meta.hot?.on('vite:error', payload => {
  const { message, id, frame, plugin, loc } = payload.err
  const problem: Problem = {
    source: 'vite',
    path: problemPath(loc?.file ?? id),
    position: loc ? { line: loc.line, column: loc.column } : null,
    severity: 'error',
    message: [message, frame].filter(Boolean).join('\n'),
    code: plugin ?? null,
  }
  post({ tag: PREVIEW_MESSAGE_TAG, kind: 'vite-error', problem })
})

// 頁面載入或熱更新時，上一個錯誤已消除。載入時發生的錯誤於此之後才送達
post({ tag: PREVIEW_MESSAGE_TAG, kind: 'vite-error', problem: null })
import.meta.hot?.on('vite:beforeUpdate', () => post({ tag: PREVIEW_MESSAGE_TAG, kind: 'vite-error', problem: null }))

window.addEventListener('message', (event: MessageEvent<PreviewCommand | undefined>) => {
  if (event.source === window.parent && event.data?.tag === PREVIEW_MESSAGE_TAG && event.data.kind === 'reload') {
    window.location.reload()
  }
})
