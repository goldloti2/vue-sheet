import type { PageAction } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, onActivated, ref, toValue, watch } from 'vue'
import { leaveAfterAction, navigationDefaults } from '@/router'
import { columnValues, emptyRow } from '@/schema/types'
import { validateRow } from '@/schema/validation'
import { useTablesStore } from '@/stores/tables'
import { useTableRow } from './useTableRow'

interface HasId {
  id: string
}

const INVALID_MESSAGE = '請先修正標示的欄位'

function sameValue (a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  return a === b
}

// 只比 schema 上的欄位，id 之類的系統欄位不算使用者的改動
function isDirty (form: object | null, pristine: object | null, schema: TableSchema): boolean {
  if (!form || !pristine) {
    return false
  }

  return schema.columns.some(column => !sameValue(
    (form as Record<string, unknown>)[column.key],
    (pristine as Record<string, unknown>)[column.key],
  ))
}

// 底部動作列用的取消／送出。只有真的改過東西時取消才帶 `confirm`。
function formActions (
  submitLabel: string,
  submit: () => Promise<void>,
  leave: () => void,
  dirty: () => boolean,
): ComputedRef<PageAction[]> {
  return computed(() => [
    {
      key: 'cancel',
      label: '取消',
      onClick: leave,
      ...(dirty() && { confirm: { title: '放棄變更', text: '有尚未儲存的變更，確定要離開嗎？' } }),
    },
    {
      key: 'submit',
      label: submitLabel,
      onClick: submit,
    },
  ])
}

function useValidation (schema: TableSchema, row: () => object | null) {
  const fieldErrors = ref<Record<string, string>>({})
  const showErrors = ref(false)

  function validate (): boolean {
    const current = row()
    fieldErrors.value = current ? validateRow(current, schema) : {}
    return Object.keys(fieldErrors.value).length === 0
  }

  watch(row, () => {
    if (showErrors.value) {
      validate()
    }
  })

  function check (): boolean {
    showErrors.value = true
    return validate()
  }

  function reset () {
    showErrors.value = false
    fieldErrors.value = {}
  }

  return { fieldErrors, check, reset }
}

function useSubmitState () {
  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function run (action: () => Promise<void>) {
    submitting.value = true
    error.value = null

    try {
      await action()
    } catch (submitError) {
      error.value = submitError instanceof Error ? submitError.message : String(submitError)
    } finally {
      submitting.value = false
    }
  }

  return { submitting, error, run }
}

/**
 * 初始值由三層疊出來，優先度由上而下：
 *   1. `defaults` 參數（頁面自己算得出來的，例如巢狀路由的父層 id）
 *   2. 導覽帶來的 `history.state.defaults`（從哪裡按新增決定，見 useNewAction）
 *   3. schema 的 `default`（跟來源無關的固定預設值）
 */
export function useCreateForm<Row extends HasId> (
  table: TableKey,
  schema: TableSchema,
  defaults?: Partial<Row>,
) {
  const store = useTablesStore()

  function initialForm (): Row {
    return {
      ...emptyRow<Row>(schema),
      ...navigationDefaults<Row>(),
      ...defaults,
    } as Row
  }

  const form = ref<Row>(initialForm())
  const pristine = ref<Row>({ ...form.value } as Row)

  const { submitting, error, run } = useSubmitState()
  const { fieldErrors, check, reset: resetErrors } = useValidation(schema, () => form.value)

  onActivated(() => {
    const initial = initialForm()
    form.value = initial
    pristine.value = { ...initial } as Row
    error.value = null
    resetErrors()
  })

  async function submit () {
    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    await run(async () => {
      await store.create<Row>(table, columnValues(form.value, schema))
      leaveAfterAction(`/${table}`)
    })
  }

  const actions = formActions(
    '新增',
    submit,
    () => leaveAfterAction(`/${table}`),
    () => isDirty(form.value, pristine.value, schema),
  )

  return { form, fieldErrors, submitting, error, submit, actions }
}

export function useEditForm<Row extends HasId> (
  table: TableKey,
  schema: TableSchema,
  id: MaybeRefOrGetter<string>,
) {
  const store = useTablesStore()

  const { row, loading, error: loadError } = useTableRow<Row>(table, id)

  // 複製一份，不直接改快取裡的資料
  const form = ref<Row | null>(null)
  watch(row, newRow => {
    form.value = newRow ? { ...newRow } as Row : null
  }, { immediate: true })

  const { submitting, error, run } = useSubmitState()
  const { fieldErrors, check, reset: resetErrors } = useValidation(schema, () => form.value)

  // 同一個網址共用一個 KeepAlive 實例，所以離開再回來會是同一個 setup。
  // 不重置的話，上次沒存就離開的輸入會留在表單裡（見 README 4.3）
  onActivated(() => {
    form.value = row.value ? { ...row.value } as Row : null
    error.value = null
    resetErrors()
  })

  const dirty = () => isDirty(form.value, row.value, schema)

  async function submit () {
    const current = form.value
    if (!current) {
      return
    }

    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    if (!dirty()) {
      leaveAfterAction(`/${table}/${current.id}`)
      return
    }

    await run(async () => {
      await store.update<Row>(table, current.id, columnValues(current, schema))
      leaveAfterAction(`/${table}/${current.id}`)
    })
  }

  const actions = formActions(
    '儲存',
    submit,
    () => leaveAfterAction(`/${table}/${toValue(id)}`),
    dirty,
  )

  return { form, fieldErrors, loading, loadError, submitting, error, submit, actions }
}
