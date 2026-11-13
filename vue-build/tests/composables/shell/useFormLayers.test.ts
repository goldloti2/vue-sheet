import type { ChildRow, NoteRow, ParentRow } from '../../fixtures/backend/schema'
import type { createFakeRouter } from '../../fixtures/router'
import type * as TableFormModule from '@/composables/form/useTableForm'
import type { TableForm } from '@/composables/form/useTableForm'
import type * as FlowModule from '@/composables/navigation/useFlow'
import type * as StateModule from '@/composables/shell/formLayerState'
import type { Layer } from '@/composables/shell/formLayerState'
import type * as AskFieldsModule from '@/composables/shell/useAskFields'
import type * as FormLayersModule from '@/composables/shell/useFormLayers'
import type { TableSchema } from '@/schema/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshBackend } from '../../fixtures/backend/fresh'
import { CHILDREN, NOTES, PARENTS, schemas } from '../../fixtures/backend/schema'

vi.mock('@/schema', () => import('../../fixtures/backend/schema'))
vi.mock('@/services/mock/tables', () => import('../../fixtures/backend/tables'))
vi.mock('@/config/app', async importOriginal => ({ ...await importOriginal<object>(), authMethod: 'none' }))
vi.mock('@/router', async () => ({
  default: (await import('../../fixtures/router')).createFakeRouter(),
  leaveAfterAction: vi.fn(),
}))
vi.mock('@/composables/shell/useDialogs', () => ({ confirm: vi.fn(async () => true), notify: vi.fn() }))

let router: ReturnType<typeof createFakeRouter>
let store: Awaited<ReturnType<typeof loadStore>>
let state: typeof StateModule
let flow: typeof FlowModule
let formLayers: typeof FormLayersModule
let tableForm: typeof TableFormModule
let askFields: typeof AskFieldsModule
let dialogs: { confirm: ReturnType<typeof vi.fn>, notify: ReturnType<typeof vi.fn> }

async function loadStore () {
  return (await import('@/stores/tables')).useTablesStore()
}

beforeEach(async () => {
  await freshBackend()
  router = (await import('@/router')).default as unknown as typeof router
  // vi.resetModules 不會重新執行 vi.mock 的工廠函數
  router.reset()
  vi.clearAllMocks()
  store = await loadStore()
  state = await import('@/composables/shell/formLayerState')
  flow = await import('@/composables/navigation/useFlow')
  formLayers = await import('@/composables/shell/useFormLayers')
  tableForm = await import('@/composables/form/useTableForm')
  askFields = await import('@/composables/shell/useAskFields')
  dialogs = await import('@/composables/shell/useDialogs') as unknown as typeof dialogs
  await store.ensureLoaded(NOTES)
})

// 等待非同步的導覽與其後的步驟完成
async function settle () {
  for (let round = 0; round < 5; round++) {
    await new Promise(resolve => setTimeout(resolve))
  }
}

function topLayer (): Layer {
  return state.layers.value.at(-1)!
}

// 開啟表單層，並如同 FormLayer 建立它的表單
async function openCreate<Row = { id: string }> (table: typeof PARENTS, defaults?: Record<string, unknown>) {
  const result = formLayers.openForm<Row>(table, { defaults })
  await settle()
  const form = tableForm.useCreateForm(table, schemaOf(table), topLayer(), defaults)
  return { result, form, layer: topLayer() }
}

function schemaOf (table: typeof PARENTS) {
  return (schemas as unknown as Record<string, TableSchema>)[table]!
}

function setField (form: TableForm, key: string, value: unknown) {
  form.form.value = { ...form.form.value, [key]: value }
}

function rowCount (table: typeof PARENTS) {
  return store.rows[table]!.length
}

describe('堆疊', () => {
  it('開啟時佔一格 history，網址不變，並保留頁面自己的 state', async () => {
    router.setPageState({ dashboardPanel: 'list' })
    await openCreate(PARENTS)

    expect(router.index).toBe(1)
    expect(router.entries[1]).toMatchObject({ fullPath: '/list', state: { dashboardPanel: 'list', formLayer: { depth: 1 } } })
    expect(state.layers.value).toHaveLength(1)
  })

  it('關閉後回傳結果時，history 已回到下方那一格', async () => {
    const { result, layer } = await openCreate(PARENTS)
    let indexAtResult = -1
    void result.then(() => {
      indexAtResult = router.index
    })

    formLayers.closeLayer(layer, 'done')

    expect(await result).toBe('done')
    expect(indexAtResult).toBe(0)
    expect(state.layers.value).toEqual([])
  })

  it('返回只關閉最上層，回傳 null，下層繼續開啟', async () => {
    const outer = await openCreate(PARENTS)
    const inner = await openCreate(CHILDREN)

    router.back()
    await settle()

    expect(await inner.result).toBeNull()
    expect(state.layers.value).toEqual([outer.layer])
    expect(router.index).toBe(1)
  })

  it('一次退多格時關閉多層，由最上層開始交出結果', async () => {
    const order: string[] = []
    const outer = await openCreate(PARENTS)
    const inner = await openCreate(CHILDREN)
    void outer.result.then(() => order.push('outer'))
    void inner.result.then(() => order.push('inner'))

    router.go(-2)
    await settle()

    expect(state.layers.value).toEqual([])
    expect(order).toEqual(['inner', 'outer'])
  })

  it('離開到其他頁面時關閉所有層', async () => {
    const { result } = await openCreate(PARENTS)

    await router.replace('/login')

    expect(await result).toBeNull()
    expect(state.layers.value).toEqual([])
  })

  it('取代沿用的標記不屬於新的網址', async () => {
    await openCreate(PARENTS)

    await router.replace('/other')

    expect(router.options.history.state.formLayer).toMatchObject({ path: '/list' })
    expect(state.markerOf(router.options.history.state, '/other')).toBeUndefined()
    expect(state.layers.value).toEqual([])
  })
})

describe('失效的格子', () => {
  it('取消後按下一頁：跳回下方的頁面，不開啟表單，也不寫入', async () => {
    const { layer } = await openCreate(PARENTS)
    formLayers.requestCloseLayer()
    await settle()
    expect(layer.closing).toBe(false)
    const before = rowCount(PARENTS)

    router.forward()
    await settle()

    expect(router.index).toBe(0)
    expect(state.layers.value).toEqual([])
    expect(rowCount(PARENTS)).toBe(before)
    expect(store.hasPending).toBe(false)
  })

  it('送出後按下一頁：不開啟表單，也不再次寫入', async () => {
    const { form, result } = await openCreate(PARENTS)
    setField(form, 'status', '進行中')
    await form.submit()
    await result
    const after = rowCount(PARENTS)

    router.forward()
    await settle()

    expect(router.index).toBe(0)
    expect(state.layers.value).toEqual([])
    expect(rowCount(PARENTS)).toBe(after)
  })

  it('有存活的層時，只跳回那一層', async () => {
    const outer = await openCreate(PARENTS)
    await openCreate(CHILDREN)
    router.back()
    await settle()

    router.forward()
    await settle()

    expect(router.index).toBe(1)
    expect(state.layers.value).toEqual([outer.layer])
  })

  it('重新整理後一路跳回基底，不開啟表單，也不寫入', async () => {
    const before = rowCount(PARENTS)

    router.reloadAt([
      { fullPath: '/list', state: { position: 0 } },
      { fullPath: '/list', state: { position: 1, formLayer: { id: 90, depth: 1, path: '/list' } } },
      { fullPath: '/list', state: { position: 2, formLayer: { id: 91, depth: 2, path: '/list' } } },
    ], 2)
    await settle()

    expect(router.index).toBe(0)
    expect(state.layers.value).toEqual([])
    expect(rowCount(PARENTS)).toBe(before)
    expect(store.hasPending).toBe(false)
  })
})

describe('寫入', () => {
  it('連續送出兩次只寫入一列', async () => {
    const { form, result } = await openCreate(PARENTS)
    setField(form, 'status', '進行中')
    const before = rowCount(PARENTS)

    await form.submit()
    await form.submit()
    await result
    await form.submit()

    expect(rowCount(PARENTS)).toBe(before + 1)
  })

  it('選單擋下返回時不恢復送出，再次離開且只有一列', async () => {
    const { form, result } = await openCreate(PARENTS)
    setField(form, 'status', '進行中')
    const before = rowCount(PARENTS)
    router.blockNextPop()

    await form.submit()
    await settle()
    await form.submit()

    expect(await result).toMatchObject({ status: '進行中' })
    expect(rowCount(PARENTS)).toBe(before + 1)
    expect(router.index).toBe(0)
  })

  it('取消不寫入', async () => {
    const { form, result } = await openCreate(PARENTS)
    setField(form, 'status', '進行中')
    const before = rowCount(PARENTS)

    formLayers.requestCloseLayer()

    expect(await result).toBeNull()
    expect(rowCount(PARENTS)).toBe(before)
    expect(store.hasPending).toBe(false)
  })

  it('驗證未通過時不寫入，層繼續開啟', async () => {
    const { form, layer } = await openCreate(PARENTS)
    const before = rowCount(PARENTS)

    await form.submit()
    await settle()

    expect(form.fieldErrors.value.status).toBeTruthy()
    expect(rowCount(PARENTS)).toBe(before)
    expect(topLayer()).toBe(layer)
  })

  it('子表單的結果只填入發起的欄位，外層的其他值不變', async () => {
    const outer = await openCreate<ChildRow>(CHILDREN, { name: '外層' })
    setField(outer.form, 'note', '填到一半')

    // FieldInput 的「＋ 新增…」：等待結果後填入自己的欄位
    const inner = await openCreate<ParentRow>(PARENTS)
    setField(inner.form, 'status', '進行中')
    await inner.form.submit()
    const parent = await inner.result
    setField(outer.form, 'parent', parent!.id)

    expect(topLayer()).toBe(outer.layer)
    expect(outer.form.form.value).toMatchObject({ parent: parent!.id, name: '外層', note: '填到一半' })
    expect(outer.layer.closing).toBe(false)
  })

  it('子表單取消時，外層完全不變', async () => {
    const outer = await openCreate(CHILDREN, { name: '外層' })
    const before = { ...outer.form.form.value }
    const parents = rowCount(PARENTS)

    const inner = await openCreate(PARENTS)
    setField(inner.form, 'status', '進行中')
    formLayers.requestCloseLayer()

    expect(await inner.result).toBeNull()
    expect(outer.form.form.value).toEqual(before)
    expect(rowCount(PARENTS)).toBe(parents)
    expect(topLayer()).toBe(outer.layer)
  })

  it('外層取消時，子表單新增的父列保留', async () => {
    const outer = await openCreate(CHILDREN)
    const inner = await openCreate<ParentRow>(PARENTS)
    setField(inner.form, 'status', '進行中')
    await inner.form.submit()
    const parent = await inner.result

    formLayers.requestCloseLayer()
    await outer.result

    expect((store.rows[PARENTS] as ParentRow[]).some(row => row.id === parent!.id)).toBe(true)
  })

  it('編輯：只修改傳入 id 的那一列，沒有改動時不寫入', async () => {
    const target = (store.rows[CHILDREN] as ChildRow[])[0]!
    const other = (store.rows[CHILDREN] as ChildRow[])[1]!
    const otherName = other.name

    const untouched = formLayers.openForm(CHILDREN, { id: target.id })
    await settle()
    const unchanged = tableForm.useEditForm(CHILDREN, schemaOf(CHILDREN), topLayer(), target.id)
    await unchanged.submit()
    await untouched
    expect(store.hasPending).toBe(false)

    const result = formLayers.openForm(CHILDREN, { id: target.id })
    await settle()
    const edit = tableForm.useEditForm(CHILDREN, schemaOf(CHILDREN), topLayer(), target.id)
    setField(edit, 'name', '新名稱')
    await edit.submit()

    expect(await result).toMatchObject({ id: target.id, name: '新名稱' })
    expect(other.name).toBe(otherName)
  })
})

describe('流程', () => {
  async function submitStep (table: typeof PARENTS, values: Record<string, unknown>) {
    await settle()
    const form = tableForm.useCreateForm(table, schemaOf(table), topLayer(), values)
    await form.submit()
    await settle()
  }

  it('第二步取代第一步的格子，完成時保留寫入', async () => {
    const before = rowCount(PARENTS)
    const done = flow.runFlow(async () => {
      const parent = await flow.runStep<ParentRow>(PARENTS)
      await flow.runStep<ChildRow>(CHILDREN, { defaults: { parent: parent.id } })
      await router.replace(`/parents/${parent.id}`)
    })

    await submitStep(PARENTS, { status: '進行中' })
    expect(router.entries).toHaveLength(2)
    expect(topLayer().alwaysAsk).toBe(true)

    await submitStep(CHILDREN, { parent: 'P-0001', name: '子列' })
    await done

    expect(router.entries).toHaveLength(2)
    expect(router.currentRoute.value.path).toMatch(/^\/parents\//)
    expect(state.layers.value).toEqual([])
    expect(rowCount(PARENTS)).toBe(before + 1)
    expect(store.canSync).toBe(true)
  })

  it('最後的導覽前往發起流程的網址時，回到發起流程的格子', async () => {
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
      await router.replace('/list')
    })

    await submitStep(PARENTS, { status: '進行中' })
    await done
    await settle()

    expect(router.index).toBe(0)
    expect(router.currentRoute.value.path).toBe('/list')
    expect(state.layers.value).toEqual([])
  })

  it('沒有最後的導覽時，離開保留的格子', async () => {
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
    })

    await submitStep(PARENTS, { status: '進行中' })
    await done
    await settle()

    expect(router.index).toBe(0)
    expect(state.layers.value).toEqual([])
  })

  it('取消時還原整個流程，包含子表單新增的父列', async () => {
    const parents = rowCount(PARENTS)
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
      await flow.runStep<ChildRow>(CHILDREN)
    })

    await submitStep(PARENTS, { status: '進行中' })
    await settle()
    const inner = await openCreate<ParentRow>(PARENTS)
    setField(inner.form, 'status', '暫停')
    await inner.form.submit()
    await inner.result
    expect(rowCount(PARENTS)).toBe(parents + 2)

    formLayers.requestCloseLayer()
    await done

    expect(rowCount(PARENTS)).toBe(parents)
    expect(store.hasPending).toBe(false)
    expect(state.layers.value).toEqual([])
    expect(router.index).toBe(0)
  })

  it('流程中不能同步', async () => {
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
    })
    await settle()

    expect(store.canSync).toBe(false)

    formLayers.requestCloseLayer()
    await done
  })

  it('流程的程式拋出錯誤時，還原並離開保留的格子', async () => {
    const parents = rowCount(PARENTS)
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
      throw new Error('連接器出錯')
    })

    await submitStep(PARENTS, { status: '進行中' })
    await done
    await settle()

    expect(dialogs.notify).toHaveBeenCalledWith('連接器出錯', 'error')
    expect(rowCount(PARENTS)).toBe(parents)
    expect(router.index).toBe(0)
  })
})

describe('離開確認', () => {
  it('有改動時詢問。拒絕時留在原處，內容不變', async () => {
    const { form, layer } = await openCreate(PARENTS)
    setField(form, 'note', '內容')
    dialogs.confirm.mockResolvedValueOnce(false)

    router.back()
    await settle()

    expect(dialogs.confirm).toHaveBeenCalledWith('放棄變更', '有尚未儲存的變更，確定要離開嗎？')
    expect(topLayer()).toBe(layer)
    expect(router.index).toBe(1)
    expect(form.form.value).toMatchObject({ note: '內容' })
  })

  it('沒有改動時不詢問', async () => {
    const { result } = await openCreate(PARENTS)

    router.back()
    await result

    expect(dialogs.confirm).not.toHaveBeenCalled()
  })

  it('開啟子表單與送出後返回皆不詢問', async () => {
    const outer = await openCreate(CHILDREN)
    setField(outer.form, 'note', '內容')

    const inner = await openCreate(PARENTS)
    setField(inner.form, 'status', '進行中')
    await inner.form.submit()
    await inner.result

    expect(dialogs.confirm).not.toHaveBeenCalled()
  })

  it('子表單沒有改動時，返回不因外層的改動而詢問', async () => {
    const outer = await openCreate(CHILDREN)
    setField(outer.form, 'note', '內容')
    const inner = await openCreate(PARENTS)

    router.back()
    await inner.result

    expect(dialogs.confirm).not.toHaveBeenCalled()
  })

  it('前往其他頁面時，任一層有改動即詢問', async () => {
    const outer = await openCreate(CHILDREN)
    setField(outer.form, 'note', '內容')
    await openCreate(PARENTS)
    dialogs.confirm.mockResolvedValueOnce(false)

    await router.replace('/login')

    expect(dialogs.confirm).toHaveBeenCalledOnce()
    expect(state.layers.value).toHaveLength(2)
  })

  it('流程的第二步起一律詢問，第二步上的子表單只看自己', async () => {
    const done = flow.runFlow(async () => {
      await flow.runStep<ParentRow>(PARENTS)
      await flow.runStep<ChildRow>(CHILDREN)
    })
    await settle()
    const first = tableForm.useCreateForm(PARENTS, schemaOf(PARENTS), topLayer(), { status: '進行中' })
    await first.submit()
    await settle()

    const inner = await openCreate(PARENTS)
    router.back()
    await inner.result
    expect(dialogs.confirm).not.toHaveBeenCalled()

    formLayers.requestCloseLayer()
    await done
    expect(dialogs.confirm).toHaveBeenCalledWith('放棄變更', '是否放棄未儲存的變更（包含之前的變更）？')
  })
})

describe('同步', () => {
  it('有任何層時不能同步，全部關閉後恢復', async () => {
    expect(store.canSync).toBe(true)
    const outer = await openCreate(PARENTS)
    const inner = await openCreate(CHILDREN)
    expect(store.canSync).toBe(false)

    formLayers.requestCloseLayer()
    await inner.result
    expect(store.canSync).toBe(false)

    formLayers.requestCloseLayer()
    await outer.result
    expect(store.canSync).toBe(true)
  })
})

describe('askFields', () => {
  it('對話框大小的層：確定時回傳指定欄位的值，不寫入', async () => {
    const result = askFields.askFields<NoteRow>(schemaOf(NOTES), ['content'], { title: '修改' })
    await settle()
    expect(topLayer().size).toBe('dialog')

    const fields = askFields.useFieldsForm(topLayer(), topLayer().view as Parameters<typeof askFields.useFieldsForm>[1])
    fields.form.value = { content: '新內容' }
    fields.confirmFields()

    expect(await result).toEqual({ content: '新內容' })
    expect(store.hasPending).toBe(false)
  })

  it('驗證未通過時不關閉，取消時為 null', async () => {
    const result = askFields.askFields<NoteRow>(schemaOf(NOTES), ['content'])
    await settle()
    const layer = topLayer()
    const fields = askFields.useFieldsForm(layer, layer.view as Parameters<typeof askFields.useFieldsForm>[1])

    fields.confirmFields()
    await settle()
    expect(fields.errors.value.content).toBeTruthy()
    expect(topLayer()).toBe(layer)

    formLayers.requestCloseLayer()
    expect(await result).toBeNull()
  })

  it('兩個對話框不會互相取消', async () => {
    const outer = askFields.askFields<NoteRow>(schemaOf(NOTES), ['content'])
    await settle()
    const outerLayer = topLayer()
    const inner = askFields.askFields<NoteRow>(schemaOf(NOTES), ['content'])
    await settle()

    formLayers.requestCloseLayer()
    expect(await inner).toBeNull()
    expect(topLayer()).toBe(outerLayer)

    formLayers.requestCloseLayer()
    expect(await outer).toBeNull()
  })
})

describe('formTitle', () => {
  it('中文與英文之間加上空格', () => {
    expect(tableForm.formTitle({ tableLabel: '批' } as TableSchema, false)).toBe('新增批')
    expect(tableForm.formTitle({ tableLabel: 'ABC' } as TableSchema, true)).toBe('編輯 ABC')
  })
})
