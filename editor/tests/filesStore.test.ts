import type { FileContent, WriteResult } from '../shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFile, onServerEvent, putFile } from '@/api'
import { useFilesStore } from '@/stores/files'
import { FILE_CHANGED_EVENT } from '../shared/api'

vi.mock('@/api', () => ({
  fetchFile: vi.fn(),
  fetchProjectIndex: vi.fn(),
  onServerEvent: vi.fn(),
  putFile: vi.fn(),
}))

const PATH = 'vue-build/src/schema/tables/order.ts'

function content (text: string, hash: string): FileContent {
  return { path: PATH, text, hash }
}

// 服務經由 websocket 推送事件
function emitServerEvent (event: string, data: unknown): void {
  for (const [name, handler] of vi.mocked(onServerEvent).mock.calls) {
    if (name === event) {
      handler(data)
    }
  }
}

describe('files store save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(fetchFile).mockResolvedValue(content('a', 'h1'))
  })

  it('does not report its own write as a change made elsewhere', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')
    vi.mocked(putFile).mockImplementation(async () => {
      emitServerEvent(FILE_CHANGED_EVENT, { path: PATH, hash: 'h2' })
      return { ok: true, file: content('b', 'h2') } satisfies WriteResult
    })

    await store.save(PATH)

    expect(store.message).toBeNull()
    expect(store.current).toMatchObject({ savedText: 'b', text: 'b', hash: 'h2' })
    expect(fetchFile).toHaveBeenCalledTimes(1)
  })

  it('reloads a change made elsewhere during the save', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')
    vi.mocked(putFile).mockImplementation(async () => {
      emitServerEvent(FILE_CHANGED_EVENT, { path: PATH, hash: 'h3' })
      return { ok: true, file: content('b', 'h2') } satisfies WriteResult
    })
    vi.mocked(fetchFile).mockResolvedValue(content('c', 'h3'))

    await store.save(PATH)

    expect(store.message).toBeNull()
    expect(store.current).toMatchObject({ savedText: 'c', text: 'c', hash: 'h3' })
  })

  it('keeps edits made during the save', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')
    vi.mocked(putFile).mockImplementation(async () => {
      store.setText(PATH, 'bc')
      return { ok: true, file: content('b;', 'h2') } satisfies WriteResult
    })

    await store.save(PATH)

    expect(store.current).toMatchObject({ savedText: 'b;', text: 'bc' })
  })
})
