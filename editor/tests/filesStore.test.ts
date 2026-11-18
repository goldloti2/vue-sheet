import type { FileContent, WriteResult } from '../shared/api'
import type { SchemaTestContext } from './schema/setup'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFile, onServerEvent, parseSchemaText, putFile, putPreviewDraft, renameColumnKey } from '@/api'
import { PREVIEW_SYNC_DELAY, useFilesStore } from '@/stores/files'
import { parseSchema } from '../server/schema/schemaModel'
import { FILE_CHANGED_EVENT } from '../shared/api'
import { loadSchemaTestContext } from './schema/setup'

vi.mock('@/api', () => ({
  clearPreviewDrafts: vi.fn(),
  fetchFile: vi.fn(),
  fetchProjectIndex: vi.fn(),
  onServerEvent: vi.fn(),
  parseSchemaText: vi.fn(),
  putFile: vi.fn(),
  putPreviewDraft: vi.fn(),
  renameColumnKey: vi.fn(),
}))

const PATH = 'vue-build/src/schema/tables/order.ts'

let context: SchemaTestContext

// 解析以服務端的函數代替
beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

beforeEach(() => {
  vi.mocked(parseSchemaText).mockImplementation(async text => parseSchema(context.ts, text))
})

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

  it('reports whether the text was written', async () => {
    const store = useFilesStore()
    await store.open(PATH)

    expect(await store.save(PATH)).toBe(true)
    expect(putFile).not.toHaveBeenCalled()

    store.setText(PATH, 'b')
    vi.mocked(putFile).mockResolvedValue({ ok: false, file: content('c', 'h3') })

    expect(await store.save(PATH)).toBe(false)
  })

  it('lists the unsaved text of the other files', async () => {
    const store = useFilesStore()
    const other = 'vue-build/src/pages/order/index.vue'
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: 'a', hash: 'h1' }))
    await store.open(PATH)
    await store.open(other)
    store.setText(PATH, 'b')
    store.setText(other, 'c')

    expect(store.draftsExcept(PATH)).toEqual([{ path: other, text: 'c' }])
  })
})

describe('files store preview drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setActivePinia(createPinia())
    vi.mocked(fetchFile).mockResolvedValue(content('a', 'h1'))
  })

  it('sends the unsaved text once and clears it after discard', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')

    await store.syncPreview(PATH)
    await store.syncPreview(PATH)
    store.discard(PATH)
    await vi.waitFor(() => expect(putPreviewDraft).toHaveBeenCalledTimes(2))

    expect(vi.mocked(putPreviewDraft).mock.calls).toEqual([
      [{ path: PATH, text: 'b' }],
      [{ path: PATH, text: null }],
    ])
  })

  it('clears the draft after save', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')
    await store.syncPreview(PATH)
    vi.mocked(putFile).mockResolvedValue({ ok: true, file: content('b', 'h2') })

    await store.save(PATH)

    expect(vi.mocked(putPreviewDraft).mock.calls.at(-1)).toEqual([{ path: PATH, text: null }])
  })

  it('waits for the delay before a delayed update', async () => {
    vi.useFakeTimers()
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, 'b')

    store.syncPreviewSoon(PATH)
    vi.advanceTimersByTime(PREVIEW_SYNC_DELAY - 1)
    store.setText(PATH, 'bc')
    store.syncPreviewSoon(PATH)
    vi.advanceTimersByTime(PREVIEW_SYNC_DELAY - 1)
    expect(putPreviewDraft).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(vi.mocked(putPreviewDraft).mock.calls).toEqual([[{ path: PATH, text: 'bc' }]])
    vi.useRealTimers()
  })
})

describe('files store column changes', () => {
  const PAGE = 'vue-build/src/pages/order/index.vue'
  const withoutDate = () => context.template.replace('    { key: \'date\', label: \'日期\', type: \'date\' },\n', '')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setActivePinia(createPinia())
    vi.mocked(parseSchemaText).mockImplementation(async text => parseSchema(context.ts, text))
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: path === PATH ? context.template : 'a', hash: 'h1' }))
  })

  it('keeps the preview while the columns change', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, withoutDate())

    await store.syncPreview(PATH)

    expect(putPreviewDraft).not.toHaveBeenCalled()
    expect(store.previewHeld).toEqual(new Set([PATH]))
  })

  it('keeps the preview of linked files until the schema is saved', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, withoutDate())
    store.setDraft(PAGE, 'b', { path: PAGE, text: 'a', hash: 'h1' })
    store.linkFiles(PATH, [PAGE])

    await store.syncPreview(PAGE)
    expect(putPreviewDraft).not.toHaveBeenCalled()

    vi.mocked(putFile).mockResolvedValue({ ok: true, file: { path: PATH, text: withoutDate(), hash: 'h2' } })
    await store.save(PATH)

    expect(vi.mocked(putPreviewDraft).mock.calls).toContainEqual([{ path: PAGE, text: 'b' }])
    expect(store.previewHeld.size).toBe(0)
  })

  it('asks before saving column changes and lists the linked files left unsaved', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, withoutDate())
    store.setDraft(PAGE, 'b', { path: PAGE, text: 'a', hash: 'h1' })
    store.linkFiles(PATH, [PAGE])

    await store.requestSave(PATH)

    expect(putFile).not.toHaveBeenCalled()
    expect(store.saveConfirm).toEqual({ paths: [PATH], changes: [{ path: PATH, title: 'order', items: ['刪除欄位 date'] }], unsavedLinked: [PAGE] })

    vi.mocked(putFile).mockResolvedValue({ ok: true, file: { path: PATH, text: withoutDate(), hash: 'h2' } })
    await store.confirmSave()

    expect(putFile).toHaveBeenCalledTimes(1)
    expect(store.saveConfirm).toBeNull()
  })

  it('saves at once when no column changes', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    store.setText(PATH, context.template.replace('tableLabel: \'範本\'', 'tableLabel: \'樣本\''))
    vi.mocked(putFile).mockResolvedValue({ ok: true, file: content('x', 'h2') })

    await store.requestSave(PATH)

    expect(store.saveConfirm).toBeNull()
    expect(putFile).toHaveBeenCalledTimes(1)
  })

  it('reverses the key renames in other files on discard', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    vi.mocked(renameColumnKey).mockImplementation(async request => ({
      text: request.text.replaceAll(request.oldKey, request.newKey),
      others: [{ path: PAGE, text: `row.${request.newKey}`, base: { path: PAGE, text: 'row.date', hash: 'h1' } }],
    }))

    expect(await store.renameKey(PATH, 'date', 'orderedAt')).toBeNull()
    expect(store.textOf(PAGE)).toBe('row.orderedAt')

    await store.discard(PATH)

    expect(vi.mocked(renameColumnKey).mock.calls.map(([request]) => [request.oldKey, request.newKey])).toEqual([['date', 'orderedAt'], ['orderedAt', 'date']])
    expect(store.textOf(PAGE)).toBe('row.date')
    expect(store.dirtyPaths.size).toBe(0)
  })

  it('reverses the CSV header rename on discard', async () => {
    const CSV = 'vue-build/mock/order-test.csv'
    const store = useFilesStore()
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: path === CSV ? 'ID,日期\n' : context.template, hash: 'h1' }))
    await store.open(PATH)

    expect(await store.renameMockHeader(PATH, CSV, '日期', '下訂日期')).toBeNull()
    expect(store.textOf(CSV)).toBe('ID,下訂日期\n')

    await store.discard(PATH)

    expect(store.textOf(CSV)).toBe('ID,日期\n')
    expect(store.message).toBeNull()
  })

  it('reports the edits that cannot be reversed', async () => {
    const CSV = 'vue-build/mock/order-test.csv'
    const store = useFilesStore()
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: path === CSV ? 'ID,日期\n' : context.template, hash: 'h1' }))
    await store.open(PATH)
    await store.renameMockHeader(PATH, CSV, '日期', '下訂日期')
    store.setText(CSV, 'ID,其他\n')

    await store.discard(PATH)

    expect(store.message).toContain('表頭「下訂日期」改回「日期」')
  })

  it('forgets the linked edits after save', async () => {
    const store = useFilesStore()
    await store.open(PATH)
    vi.mocked(renameColumnKey).mockImplementation(async request => ({ text: request.text.replaceAll(request.oldKey, request.newKey), others: [] }))
    await store.renameKey(PATH, 'date', 'orderedAt')
    vi.mocked(putFile).mockResolvedValue({ ok: true, file: { path: PATH, text: 'saved', hash: 'h2' } })
    await store.save(PATH)
    store.setText(PATH, 'changed')

    await store.discard(PATH)

    expect(renameColumnKey).toHaveBeenCalledTimes(1)
  })
})
