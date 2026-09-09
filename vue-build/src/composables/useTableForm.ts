import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { onActivated, ref, watch } from 'vue'
import { leaveAfterAction, navigationDefaults } from '@/router'
import { columnValues, emptyRow } from '@/schema/types'
import { validateRow } from '@/schema/validation'
import { useTablesStore } from '@/stores/tables'
import { useTableRow } from './useTableRow'

interface HasId {
  id: string
}

const INVALID_MESSAGE = '請先修正標示的欄位'

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
  const { submitting, error, run } = useSubmitState()
  const { fieldErrors, check, reset: resetErrors } = useValidation(schema, () => form.value)

  onActivated(() => {
    form.value = initialForm()
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

  return { form, fieldErrors, submitting, error, submit }
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
  const { fieldErrors, check } = useValidation(schema, () => form.value)

  async function submit () {
    const current = form.value
    if (!current) {
      return
    }

    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    await run(async () => {
      await store.update<Row>(table, current.id, columnValues(current, schema))
      leaveAfterAction(`/${table}/${current.id}`)
    })
  }

  return { form, fieldErrors, loading, loadError, submitting, error, submit }
}
