import type { FieldsView, Layer } from '@/composables/shell/formLayerState'
import type { ColumnDefault, TableSchema } from '@/schema/types'
import { ref, watch } from 'vue'
import { closeLayer, openLayer } from '@/composables/shell/useFormLayers'
import { isEmpty, validateRow } from '@/schema/validation'

export interface AskFieldsOptions {
  title?: string
  // 要修改的列。只有一列時，以非空的現值為初始值。有提供時主鍵唯讀
  rows?: readonly object[]
  // 沒有現值時的初始值。函式於開啟對話框時求值
  defaults?: Record<string, ColumnDefault<unknown>>
}

function initialForm (keys: string[], options: AskFieldsOptions): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const single = options.rows?.length === 1 ? options.rows[0] as Record<string, unknown> : undefined

  for (const key of keys) {
    const current = single?.[key]
    if (!isEmpty(current)) {
      result[key] = current
      continue
    }

    const fallback = options.defaults?.[key]
    result[key] = typeof fallback === 'function' ? fallback() : fallback ?? null
  }

  return result
}

function pick (form: object, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    result[key] = (form as Record<string, unknown>)[key]
  }
  return result
}

// 詢問 schema 中指定的欄位，回傳這些欄位的值。取消時為 null（見 docs/topics/actions.md 的「快速編輯對話框」）
export function askFields<Row extends object> (
  schema: TableSchema,
  keys: (keyof Row & string)[],
  options: AskFieldsOptions = {},
): Promise<Partial<Row> | null> {
  return openLayer<Partial<Row>>({
    kind: 'fields',
    title: options.title ?? keys
      .map(key => schema.columns.find(column => column.key === key)?.label ?? key)
      .join('、'),
    schema,
    keys,
    lockId: (options.rows?.length ?? 0) > 0,
    initial: initialForm(keys, options),
  })
}

// 對話框層的表單。按下一次確定後才即時更新錯誤，與表單層相同
export function useFieldsForm (layer: Layer, view: FieldsView) {
  const form = ref<object>({ ...view.initial })
  const errors = ref<Record<string, string>>({})
  const showErrors = ref(false)

  function validate (): boolean {
    errors.value = validateRow(form.value, view.schema, view.keys)
    return Object.keys(errors.value).length === 0
  }

  watch(form, () => {
    if (showErrors.value) {
      validate()
    }
  })

  function confirmFields (): void {
    showErrors.value = true
    if (validate()) {
      closeLayer(layer, pick(form.value, view.keys))
    }
  }

  return { form, errors, confirmFields }
}
