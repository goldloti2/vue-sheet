import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onServerEvent } from '@/api'
import { MAX_CONSOLE_ENTRIES, usePreviewStore } from '@/stores/preview'
import { previewEnv, previewMode, unavailableSources } from '../server/preview'
import { PREVIEW_STATUS_EVENT } from '../shared/preview'

vi.mock('@/api', () => ({
  fetchPreviewStatus: vi.fn(),
  onServerEvent: vi.fn(),
  putPreviewSource: vi.fn(),
}))

describe('preview launch', () => {
  it('reads .env.fake.local only for the fake source', () => {
    expect(previewMode('mock')).toBe('development')
    expect(previewMode('sheet')).toBe('development')
    expect(previewMode('fake')).toBe('fake')
  })

  it('clears the backend URL for the mock source only', () => {
    const base = { PATH: '/bin', VITE_APPS_SCRIPT_URL: 'https://example.com/exec' }
    expect(previewEnv('mock', base)).toMatchObject({ PATH: '/bin', VITE_APPS_SCRIPT_URL: '' })
    expect(previewEnv('sheet', base)).not.toHaveProperty('VITE_APPS_SCRIPT_URL')
    expect(previewEnv('fake', base)).not.toHaveProperty('VITE_APPS_SCRIPT_URL')
  })
})

describe('unavailableSources', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'editor-preview-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('disables both Sheets without env files', () => {
    expect(Object.keys(unavailableSources(root))).toEqual(['sheet', 'fake'])
  })

  it('enables the real Sheet with a URL in .env', async () => {
    await writeFile(path.join(root, '.env'), 'VITE_APPS_SCRIPT_URL=https://example.com/real\n')
    expect(Object.keys(unavailableSources(root))).toEqual(['fake'])
  })

  it('enables the fake Sheet with its own env file', async () => {
    await writeFile(path.join(root, '.env.fake.local'), 'VITE_APPS_SCRIPT_URL=https://example.com/fake\n')
    expect(Object.keys(unavailableSources(root))).toEqual(['sheet'])
  })
})

describe('preview store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('follows the status pushed by the service', () => {
    const store = usePreviewStore()
    const handler = vi.mocked(onServerEvent).mock.calls.find(([event]) => event === PREVIEW_STATUS_EVENT)![1]
    const status = { source: 'mock', state: 'running', url: 'http://localhost:3101/', error: null, unavailable: {} }

    handler(status)

    expect(store.status).toEqual(status)
  })

  it('keeps only the latest console entries', () => {
    const store = usePreviewStore()
    for (let index = 0; index < MAX_CONSOLE_ENTRIES + 3; index++) {
      store.addEntry({ origin: 'page', level: 'warn', text: String(index), time: index })
    }

    expect(store.entries).toHaveLength(MAX_CONSOLE_ENTRIES)
    expect(store.entries[0]!.text).toBe('3')
  })
})
