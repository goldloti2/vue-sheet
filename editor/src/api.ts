// 介面與編輯器服務之間的呼叫。其他程式一律經由此處，不自行 fetch

import type { FileContent, ProjectIndex, WriteRequest, WriteResult } from '../shared/api'
import type { ChecksSnapshot } from '../shared/checks'
import type { PreviewDraft, PreviewSource, PreviewStatus } from '../shared/preview'
import type { RegistryEditRequest, RegistryEditResult, RegistryModel } from '../shared/registry'
import type { CodeContext, CodeContextRequest, KeyRenameRequest, KeyRenameResult, SchemaEditRequest, SchemaEditResult, SchemaModel, SchemaTypes } from '../shared/schema'
import type { DeleteTableResult, MockTablesEditRequest, MockTablesEditResult, MockTablesModel, NewTableRequest, NewTableResult } from '../shared/tableFiles'
import type { CodeCompletions, CodeDiagnostic, CodeRequest, CompletionRequest } from '../shared/typescript'

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

export function fetchDiagnostics (body: CodeRequest, signal?: AbortSignal): Promise<CodeDiagnostic[]> {
  return request('/api/ts/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export function fetchCompletions (body: CompletionRequest, signal?: AbortSignal): Promise<CodeCompletions> {
  return request('/api/ts/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

function postJson<T> (url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export function fetchSchemaTypes (): Promise<SchemaTypes> {
  return request('/api/schema/types')
}

export function parseSchemaText (text: string): Promise<SchemaModel> {
  return postJson('/api/schema/parse', { text })
}

export function editSchema (body: SchemaEditRequest): Promise<SchemaEditResult> {
  return postJson('/api/schema/edit', body)
}

export function parseRegistryText (text: string): Promise<RegistryModel | null> {
  return postJson('/api/registry/parse', { text })
}

export function editRegistry (body: RegistryEditRequest): Promise<RegistryEditResult> {
  return postJson('/api/registry/edit', body)
}

export function createTable (body: NewTableRequest): Promise<NewTableResult> {
  return postJson('/api/table/create', body)
}

export function parseMockTablesText (text: string): Promise<MockTablesModel | null> {
  return postJson('/api/mock-tables/parse', { text })
}

export function editMockTables (body: MockTablesEditRequest): Promise<MockTablesEditResult> {
  return postJson('/api/mock-tables/edit', body)
}

export function createMockCsv (key: string): Promise<NewTableResult> {
  return postJson('/api/mock-tables/create-csv', { key })
}

export function deleteTable (key: string): Promise<DeleteTableResult> {
  return postJson('/api/table/delete', { key })
}

export function renameColumnKey (body: KeyRenameRequest): Promise<KeyRenameResult> {
  return postJson('/api/schema/rename-key', body)
}

export function fetchCodeContext (body: CodeContextRequest): Promise<CodeContext> {
  return postJson('/api/schema/context', body)
}

export function fetchIcons (): Promise<Record<string, string>> {
  return request('/api/icons')
}

export function fetchChecks (): Promise<ChecksSnapshot> {
  return request('/api/checks')
}

export function startBuild (): Promise<unknown> {
  return request('/api/build', { method: 'POST' })
}

export function fetchPreviewStatus (): Promise<PreviewStatus> {
  return request('/api/preview')
}

export function putPreviewSource (source: PreviewSource): Promise<PreviewStatus> {
  return request('/api/preview', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  })
}

export function putPreviewDraft (body: PreviewDraft): Promise<unknown> {
  return request('/api/preview/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function clearPreviewDrafts (): Promise<unknown> {
  return request('/api/preview/drafts', { method: 'DELETE' })
}

// 服務經由 Vite 的 websocket 推送的事件
export function onServerEvent<T> (event: string, handler: (data: T) => void): void {
  import.meta.hot?.on(event, handler)
}
