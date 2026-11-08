import type { Layer } from '@/composables/shell/formLayerState'
import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { Ref } from 'vue'
import { ref, shallowRef, watch } from 'vue'
import { useTableRow } from '@/composables/data/useTable'
import { closeLayer } from '@/composables/shell/useFormLayers'
import { columnValues, emptyRow } from '@/schema/types'
import { validateRow } from '@/schema/validation'
import { useTablesStore } from '@/stores/tables'

interface HasId {
  id: string
}

// FormLayer 顯示一張表單所需的內容，新增與編輯相同
export interface TableForm {
  form: Ref<object | null>
  fieldErrors: Ref<Record<string, string>>
  error: Ref<string | null>
  loading: Readonly<Ref<boolean>>
  loadError: Readonly<Ref<string | null>>
  submitLabel: string
  submit: () => Promise<void>
}

const INVALID_MESSAGE = '請先修正標示的欄位'

function sameValue (a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  return a === b
}

// 只比較 schema 的欄位，id 等系統欄位不計為使用者的改動
function isDirty (form: object | null, pristine: object | null, schema: TableSchema): boolean {
  if (!form || !pristine) {
    return false
  }

  return schema.columns.some(column => !sameValue(
    (form as Record<string, unknown>)[column.key],
    (pristine as Record<string, unknown>)[column.key],
  ))
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

  return { fieldErrors, check }
}

// 寫入失敗時保留表單，顯示錯誤訊息
function useSubmitState () {
  const error = ref<string | null>(null)

  function run (action: () => void) {
    error.value = null

    try {
      action()
    } catch (submitError) {
      error.value = submitError instanceof Error ? submitError.message : String(submitError)
    }
  }

  return { error, run }
}

// 表單層的標題。中文與英文之間加上空格
export function formTitle (schema: TableSchema, editing: boolean): string {
  const verb = editing ? '編輯' : '新增'
  return /^[A-Z]/i.test(schema.tableLabel) ? `${verb} ${schema.tableLabel}` : `${verb}${schema.tableLabel}`
}

// 初始值的優先順序：defaults 參數 > schema 的 default（見 docs/topics/schema.md）
export function useCreateForm (table: TableKey, schema: TableSchema, layer: Layer, defaults?: Record<string, unknown>): TableForm {
  const store = useTablesStore()

  const form = ref<object | null>({ ...emptyRow<HasId>(schema), ...defaults })
  const pristine = { ...form.value }
  const { error, run } = useSubmitState()
  const { fieldErrors, check } = useValidation(schema, () => form.value)

  layer.dirty = () => isDirty(form.value, pristine, schema)

  async function submit () {
    if (layer.closing || !form.value) {
      return
    }

    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    const values = columnValues(form.value, schema)
    run(() => closeLayer(layer, store.create<HasId>(table, values)))
  }

  return { form, fieldErrors, error, loading: shallowRef(false), loadError: shallowRef(null), submitLabel: '新增', submit }
}

export function useEditForm (table: TableKey, schema: TableSchema, layer: Layer, id: string): TableForm {
  const store = useTablesStore()

  const { row, loading, error: loadError } = useTableRow<HasId>(table, id)

  // 編輯複本，不直接修改快取中的列
  const form = ref<object | null>(null)
  watch(row, newRow => {
    form.value = newRow ? { ...newRow } : null
  }, { immediate: true })

  const { error, run } = useSubmitState()
  const { fieldErrors, check } = useValidation(schema, () => form.value)

  // 寫入快取後 row 與 form 相同，因此關閉時不計為有改動
  const dirty = () => isDirty(form.value, row.value, schema)
  layer.dirty = dirty

  async function submit () {
    const current = form.value
    if (layer.closing || !current) {
      return
    }

    if (!check()) {
      error.value = INVALID_MESSAGE
      return
    }

    if (!dirty()) {
      closeLayer(layer, current)
      return
    }

    const values = columnValues(current, schema)
    run(() => closeLayer(layer, store.update<HasId>(table, id, values)))
  }

  return { form, fieldErrors, error, loading, loadError, submitLabel: '儲存', submit }
}
