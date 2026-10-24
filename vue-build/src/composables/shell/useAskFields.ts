import type { ColumnDefault, TableSchema } from '@/schema/types'
import { shallowReactive, watch } from 'vue'
import router from '@/router'
import { isEmpty, validateRow } from '@/schema/validation'

export interface AskFieldsOptions {
  title?: string
  // 要修改的列。只有一列時，以非空的現值為初始值。有提供時主鍵唯讀
  rows?: readonly object[]
  // 沒有現值時的初始值。函式於開啟對話框時求值
  defaults?: Record<string, ColumnDefault<unknown>>
}

interface FieldsDialogState {
  open: boolean
  title: string
  schema: TableSchema | null
  keys: string[]
  form: object
  errors: Record<string, string>
  showErrors: boolean
  lockId: boolean
}

// 全 App 共用一個詢問欄位的對話框，由 AppShell 渲染（見 docs/topics/actions.md 的「快速編輯對話框」）
export const fieldsDialog = shallowReactive<FieldsDialogState>({
  open: false,
  title: '',
  schema: null,
  keys: [],
  form: {},
  errors: {},
  showErrors: false,
  lockId: false,
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

// 詢問 schema 中指定的欄位，resolve 為這些欄位的值。取消時為 null
export function askFields<Row extends object> (
  schema: TableSchema,
  keys: (keyof Row & string)[],
  options: AskFieldsOptions = {},
): Promise<Partial<Row> | null> {
  // 上一個對話框仍開啟時，視為取消
  settle(null)

  fieldsDialog.schema = schema
  fieldsDialog.keys = keys
  fieldsDialog.title = options.title ?? keys
    .map(key => schema.columns.find(column => column.key === key)?.label ?? key)
    .join('、')
  fieldsDialog.form = initialForm(keys, options)
  fieldsDialog.lockId = (options.rows?.length ?? 0) > 0
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

// 按下一次確定後才即時更新錯誤，與表單頁相同
watch(() => fieldsDialog.form, () => {
  if (fieldsDialog.showErrors) {
    validate()
  }
})

// 點選對話框外側關閉時也視為取消
watch(() => fieldsDialog.open, open => {
  if (!open) {
    settle(null)
  }
})

// 對話框位於 AppShell，換頁後仍存在，因此換頁時關閉
router.afterEach(() => {
  settle(null)
})
