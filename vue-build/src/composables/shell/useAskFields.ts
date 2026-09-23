import type { ColumnDefault, TableSchema } from '@/schema/types'
import { shallowReactive, watch } from 'vue'
import router from '@/router'
import { isEmpty, validateRow } from '@/schema/validation'

export interface AskFieldsOptions {
  title?: string
  // 要改的那幾筆；剛好一筆時，那欄非空就拿現值當初始值
  rows?: readonly object[]
  // 沒有現值時的初始值，函式型的在打開對話框那一刻才求值
  defaults?: Record<string, ColumnDefault<unknown>>
}

export interface FieldsDialogState {
  open: boolean
  title: string
  schema: TableSchema | null
  keys: string[]
  form: object
  errors: Record<string, string>
  showErrors: boolean
}

// 全 App 一個「問幾個欄位」對話框，由 AppShell 渲染（見 docs/architecture.md）
export const fieldsDialog = shallowReactive<FieldsDialogState>({
  open: false,
  title: '',
  schema: null,
  keys: [],
  form: {},
  errors: {},
  showErrors: false,
})

let pending: ((result: object | null) => void) | null = null

function settle (result: object | null): void {
  const resolve = pending
  pending = null
  fieldsDialog.open = false
  resolve?.(result)
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

function validate (): boolean {
  const { schema, form, keys } = fieldsDialog
  fieldsDialog.errors = schema ? validateRow(form, schema, keys) : {}
  return Object.keys(fieldsDialog.errors).length === 0
}

// 只問 schema 裡的幾個欄位；resolve 成那幾欄的值，取消是 null
export function askFields<Row extends object> (
  schema: TableSchema,
  keys: (keyof Row & string)[],
  options: AskFieldsOptions = {},
): Promise<Partial<Row> | null> {
  // 上一個還開著就當作取消
  settle(null)

  fieldsDialog.schema = schema
  fieldsDialog.keys = keys
  fieldsDialog.title = options.title ?? keys
    .map(key => schema.columns.find(column => column.key === key)?.label ?? key)
    .join('、')
  fieldsDialog.form = initialForm(keys, options)
  fieldsDialog.errors = {}
  fieldsDialog.showErrors = false
  fieldsDialog.open = true

  return new Promise(resolve => {
    pending = resolve as (result: object | null) => void
  })
}

export function confirmFields (): void {
  fieldsDialog.showErrors = true
  if (validate()) {
    settle(pick(fieldsDialog.form, fieldsDialog.keys))
  }
}

export function cancelFields (): void {
  settle(null)
}

// 按過一次確定之後才即時更新錯誤，跟表單頁一致
watch(() => fieldsDialog.form, () => {
  if (fieldsDialog.showErrors) {
    validate()
  }
})

// 點對話框外面關掉也算取消
watch(() => fieldsDialog.open, open => {
  if (!open) {
    settle(null)
  }
})

// 對話框掛在 AppShell 上會跨路由存活，換頁就關掉
router.afterEach(() => {
  settle(null)
})
