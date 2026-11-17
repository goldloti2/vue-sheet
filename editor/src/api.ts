// 介面與編輯器服務之間的呼叫。其他程式一律經由此處，不自行 fetch

import type { FileContent, ProjectIndex, WriteRequest, WriteResult } from '../shared/api'

async function request<T> (url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json()
  if (!response.ok && response.status !== 404) {
    throw new Error(body?.message ?? `服務回應 ${response.status}`)
  }
  return body as T
}

export function fetchProjectIndex (): Promise<ProjectIndex> {
  return request('/api/project')
}

export function fetchFile (path: string): Promise<FileContent | null> {
  return request(`/api/file?path=${encodeURIComponent(path)}`)
}

export function putFile (body: WriteRequest): Promise<WriteResult> {
  return request('/api/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// 服務經由 Vite 的 websocket 推送的事件
export function onServerEvent<T> (event: string, handler: (data: T) => void): void {
  import.meta.hot?.on(event, handler)
}
