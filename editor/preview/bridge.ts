// 預覽頁面的橋接：預覽的 dev server 把此檔注入 index.html
// 把 console 的警告與錯誤、未捕捉的錯誤與 Vite 的錯誤轉送至編輯器，並接收重新整理的指令

import type { ConsoleEntry, PreviewCommand, PreviewPageMessage } from '../shared/preview'
import { PREVIEW_MESSAGE_TAG } from '../shared/preview'

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

function send (level: ConsoleEntry['level'], values: unknown[]): void {
  if (window.parent === window) {
    return
  }
  const message: PreviewPageMessage = { tag: PREVIEW_MESSAGE_TAG, kind: 'console', level, text: values.map(value => format(value)).join(' ') }
  window.parent.postMessage(message, '*')
}

for (const level of ['warn', 'error'] as const) {
  const original = console[level].bind(console)
  console[level] = (...values: unknown[]) => {
    original(...values)
    send(level, values)
  }
}

window.addEventListener('error', event => send('error', [event.error ?? event.message]))
window.addEventListener('unhandledrejection', event => send('error', ['未處理的 Promise 錯誤：', event.reason]))

import.meta.hot?.on('vite:error', payload => {
  const { message, id, frame } = payload.err
  send('error', [[id, message, frame].filter(Boolean).join('\n')])
})

window.addEventListener('message', (event: MessageEvent<PreviewCommand | undefined>) => {
  if (event.source === window.parent && event.data?.tag === PREVIEW_MESSAGE_TAG && event.data.kind === 'reload') {
    window.location.reload()
  }
})
