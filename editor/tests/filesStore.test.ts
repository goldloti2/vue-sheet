import type { FileContent, WriteResult } from '../shared/api'
import type * as EditorPages from '../shared/editorPages'
import type { SchemaTestContext } from './schema/setup'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { editConfig, fetchFile, fetchProjectIndex, onServerEvent, parseSchemaText, putFile, putPreviewDraft, renameColumnKey } from '@/api'
import { PREVIEW_SYNC_DELAY, useFilesStore } from '@/stores/files'
import { applyConfigEdits, parseConfig } from '../server/configGs'
import { parseSchema } from '../server/schema/schemaModel'
import { FILE_CHANGED_EVENT } from '../shared/api'
import { APP_CONFIG_FILE } from '../shared/appConfig'
import { CONFIG_DEPLOY_MESSAGE, CONFIG_FILE } from '../shared/configGs'
import { SETTINGS_PAGE } from '../shared/editorPages'
import { loadSchemaTestContext } from './schema/setup'

vi.mock('@/api', () => ({
  clearPreviewDrafts: vi.fn(),
  editConfig: vi.fn(),
  fetchFile: vi.fn(),
  fetchProjectIndex: vi.fn(),
  onServerEvent: vi.fn(),
  parseSchemaText: vi.fn(),
  putFile: vi.fn(),
  putPreviewDraft: vi.fn(),
  renameColumnKey: vi.fn(),
}))

// 加上測試用的頁面，對應兩個檔案
vi.mock('../shared/editorPages', async importOriginal => {
  const actual = await importOriginal<typeof EditorPages>()
  const pages: Record<string, { title: string, paths: readonly string[] }> = { ...actual.EDITOR_PAGES, 'page:test': { title: '測試頁', paths: ['a.ts', 'b.ts'] } }
  const pageOf = (target: string) => pages[target] ?? null
  return { ...actual, pageOf, targetPaths: (target: string) => [...pageOf(target)?.paths ?? [target]] }
})

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

describe('files store Config.gs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: 'a', hash: 'h1' }))
  })

  it('reminds to deploy after saving Config.gs', async () => {
    const store = useFilesStore()
    await store.open(CONFIG_FILE)
    store.setText(CONFIG_FILE, 'b')
    vi.mocked(putFile).mockResolvedValue({ ok: true, file: { path: CONFIG_FILE, text: 'b', hash: 'h2' } })

    await store.save(CONFIG_FILE)

    expect(store.message).toBe(CONFIG_DEPLOY_MESSAGE)
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

  it('renames the Config.gs idColumn as a linked edit and reverses it on discard', async () => {
    const CONFIG = 'const TABLES = {\n  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },\n}\n'
    const store = useFilesStore()
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: path === CONFIG_FILE ? CONFIG : context.template, hash: 'h1' }))
    vi.mocked(editConfig).mockImplementation(async ({ text, edits }) => {
      const next = applyConfigEdits(context.ts, text, edits)
      return { text: next, model: parseConfig(context.ts, next) }
    })
    await store.open(PATH)

    await store.renameConfigIdColumn(PATH, 'order', 'ORD-ID', '訂單編號')
    await store.renameConfigIdColumn(PATH, 'order', '其他', '編號')
    expect(store.textOf(CONFIG_FILE)).toContain('idColumn: \'訂單編號\'')

    store.setText(PATH, withoutDate())
    await store.requestSave(PATH)
    expect(store.saveConfirm?.unsavedLinked).toEqual([CONFIG_FILE])
    store.cancelSave()

    await store.discard(PATH)
    expect(store.textOf(CONFIG_FILE)).toBe(CONFIG)
    expect(store.message).toBeNull()
    expect(vi.mocked(editConfig)).toHaveBeenCalledTimes(3)
  })

  it('reports the Config.gs idColumn that cannot be reversed', async () => {
    const CONFIG = 'const TABLES = {\n  order: { sheetName: \'訂單\', idColumn: \'ORD-ID\' },\n}\n'
    const store = useFilesStore()
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: path === CONFIG_FILE ? CONFIG : context.template, hash: 'h1' }))
    vi.mocked(editConfig).mockImplementation(async ({ text, edits }) => {
      const next = applyConfigEdits(context.ts, text, edits)
      return { text: next, model: parseConfig(context.ts, next) }
    })
    await store.open(PATH)
    await store.renameConfigIdColumn(PATH, 'order', 'ORD-ID', '訂單編號')
    store.setText(CONFIG_FILE, CONFIG.replace('ORD-ID', '其他'))

    await store.discard(PATH)

    expect(store.message).toContain('idColumn「訂單編號」改回「ORD-ID」')
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

describe('files store initialize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: '', hash: 'h1' }))
  })

  it('opens the first registered table that has a schema file', async () => {
    vi.mocked(fetchProjectIndex).mockResolvedValue({
      paths: ['vue-build/src/schema/tables/customer.ts', 'vue-build/src/schema/tables/order.ts'],
      tables: {},
      tableOrder: ['missing', 'order', 'customer'],
      mockCsv: {},
      configTables: null,
      navLinks: null,
      csvRows: {},
    })
    const store = useFilesStore()

    await store.initialize()

    expect(store.currentTarget).toBe('vue-build/src/schema/tables/order.ts')
  })
})

describe('files store pages', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(fetchFile).mockImplementation(async path => ({ path, text: 'a', hash: 'h1' }))
    vi.mocked(putFile).mockImplementation(async ({ path, text }) => ({ ok: true, file: { path, text, hash: 'h2' } }))
  })

  async function openPage (paths: string[]) {
    vi.mocked(fetchProjectIndex).mockResolvedValue({ paths, tables: {}, tableOrder: [], mockCsv: {}, configTables: null, navLinks: null, csvRows: {} })
    const store = useFilesStore()
    await store.initialize()
    await store.open('page:test')
    return store
  }

  it('opens a page and loads the files of the page that exist', async () => {
    const store = await openPage(['a.ts'])

    expect(store.currentTarget).toBe('page:test')
    expect(store.current).toBeNull()
    expect(store.currentPage?.title).toBe('測試頁')
    expect(store.currentPaths).toEqual(['a.ts', 'b.ts'])
    expect(vi.mocked(fetchFile).mock.calls).toEqual([['a.ts']])
  })

  it('saves and discards all the files of a page', async () => {
    const store = await openPage(['a.ts', 'b.ts'])
    store.setText('a.ts', 'b')
    store.setText('b.ts', 'c')

    await store.discard('page:test')

    expect(store.dirtyPaths.size).toBe(0)

    store.setText('a.ts', 'b')
    store.setText('b.ts', 'c')
    await store.requestSave('page:test')

    expect(vi.mocked(putFile).mock.calls.map(([request]) => request.path)).toEqual(['a.ts', 'b.ts'])
    expect(store.dirtyPaths.size).toBe(0)
  })

  it('opens the settings page for app.ts, and a form-only file without moving to a line', async () => {
    vi.mocked(fetchProjectIndex).mockResolvedValue({ paths: [APP_CONFIG_FILE, CONFIG_FILE], tables: {}, tableOrder: [], mockCsv: {}, configTables: null, navLinks: null, csvRows: {} })
    const store = useFilesStore()
    await store.initialize()

    await store.open(APP_CONFIG_FILE, { line: 3, column: 1 })

    expect(store.currentTarget).toBe(SETTINGS_PAGE)
    expect(store.reveal).toBeNull()
    expect(store.message).toBe(`${APP_CONFIG_FILE} 只有表單。第 3 行請以其他編輯器修改。`)

    await store.open(CONFIG_FILE, { line: 5, column: 1 })

    expect(store.currentTarget).toBe(CONFIG_FILE)
    expect(store.reveal).toBeNull()
  })
})
