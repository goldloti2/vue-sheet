import type { PageAction } from '@/composables/actions/useTableActions'
import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { computed, onActivated, ref, toValue, watch } from 'vue'
import { actionIcons } from '@/composables/actions/useTableActions'
import { useTableRow } from '@/composables/data/useTableRow'
import { useLeaveGuard } from '@/composables/form/useLeaveGuard'
import { useSyncHold } from '@/composables/form/useSyncHold'
import { resumeStep } from '@/composables/navigation/useFlow'
import { leaveAfterAction, navigationDefaults } from '@/router'
import { columnValues, emptyRow } from '@/schema/types'
import { validateRow } from '@/schema/validation'
import { useTablesStore } from '@/stores/tables'

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

// 表單完成了：在流程裡就把結果交給連接器，不然照舊離開
function finish (row: object, fallback: RouteLocationRaw): void {
  if (!resumeStep(row)) {
    leaveAfterAction(fallback)
  }
}

// 底部動作列用的取消／送出。取消不自己問，離開頁面的確認統一由 useLeaveGuard 處理
function formActions (
  submitLabel: string,
  submitIcon: string,
  submit: () => Promise<void>,
  leave: () => void,
): ComputedRef<PageAction[]> {
  return computed(() => [
    {
      key: 'cancel',
      label: '取消',
      icon: actionIcons.cancel,
      onClick: leave,
    },
    {
      key: 'submit',
      label: submitLabel,
      icon: submitIcon,
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

// 初始值三層疊出來：defaults 參數 > 導覽帶來的 > schema 的 default（見 docs/schema.md）
export function useCreateForm<Row extends HasId> (
  table: TableKey,
  schema: TableSchema,
  defaults?: Partial<Row>,
) {
  const store = useTablesStore()
  useSyncHold()

  function initialForm (): Row {
    return {
      ...emptyRow<Row>(schema),
      ...navigationDefaults<Row>(),
      ...defaults,
    } as Row
  }

  const form = ref<Row>(initialForm())
  const pristine = ref<Row>({ ...form.value } as Row)
  // 送出成功後離開不算放棄
  const settled = ref(false)

  const { submitting, error, run } = useSubmitState()
  const { fieldErrors, check, reset: resetErrors } = useValidation(schema, () => form.value)
  useLeaveGuard(() => !settled.value && isDirty(form.value, pristine.value, schema))

  onActivated(() => {
    const initial = initialForm()
    form.value = initial
    pristine.value = { ...initial } as Row
    settled.value = false
    error.value = null
    resetErrors()
  })

  async function submit () {
    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    await run(async () => {
      const created = store.create<Row>(table, columnValues(form.value, schema))
      settled.value = true
      finish(created, `/${table}`)
    })
  }

  const actions = formActions('新增', actionIcons.new, submit, () => leaveAfterAction(`/${table}`))

  return { form, fieldErrors, submitting, error, submit, actions }
}

export function useEditForm<Row extends HasId> (
  table: TableKey,
  schema: TableSchema,
  id: MaybeRefOrGetter<string>,
) {
  const store = useTablesStore()
  useSyncHold()

  const { row, loading, error: loadError } = useTableRow<Row>(table, id)

  // 複製一份，不直接改快取裡的資料
  const form = ref<Row | null>(null)
  watch(row, newRow => {
    form.value = newRow ? { ...newRow } as Row : null
  }, { immediate: true })

  const { submitting, error, run } = useSubmitState()
  const { fieldErrors, check, reset: resetErrors } = useValidation(schema, () => form.value)

  // 同一個網址共用一個 KeepAlive 實例，回來要重置（見 docs/architecture.md）
  onActivated(() => {
    form.value = row.value ? { ...row.value } as Row : null
    error.value = null
    resetErrors()
  })

  // 寫進快取後 row 就等於 form，離開時自然不算髒
  const dirty = () => isDirty(form.value, row.value, schema)
  useLeaveGuard(dirty)

  async function submit () {
    const current = form.value
    if (!current) {
      return
    }

    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    const fallback = `/${table}/${current.id}`

    if (!dirty()) {
      finish(current, fallback)
      return
    }

    await run(async () => {
      finish(store.update<Row>(table, current.id, columnValues(current, schema)), fallback)
    })
  }

  const actions = formActions('儲存', actionIcons.save, submit, () => leaveAfterAction(`/${table}/${toValue(id)}`))

  return { form, fieldErrors, loading, loadError, submitting, error, submit, actions }
}
