import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { MaybeRefOrGetter } from 'vue'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { columnValues, emptyRow } from '@/schema/types'
import { useTablesStore } from '@/stores/tables'
import { useTableRow } from './useTableRow'

interface HasId {
  id: string
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

export function useCreateForm<Row extends HasId> (table: TableKey, schema: TableSchema) {
  const router = useRouter()
  const store = useTablesStore()

  const form = ref<Row>(emptyRow<Row>(schema))
  const { submitting, error, run } = useSubmitState()

  async function submit () {
    await run(async () => {
      await store.create<Row>(table, columnValues(form.value, schema))
      await router.push(`/${table}`)
    })
  }

  return { form, submitting, error, submit }
}

export function useEditForm<Row extends HasId> (
  table: TableKey,
  schema: TableSchema,
  id: MaybeRefOrGetter<string>,
) {
  const router = useRouter()
  const store = useTablesStore()

  const { row, loading, error: loadError } = useTableRow<Row>(table, id)

  // 複製一份，不直接改快取裡的資料
  const form = ref<Row | null>(null)
  watch(row, newRow => {
    form.value = newRow ? { ...newRow } as Row : null
  }, { immediate: true })

  const { submitting, error, run } = useSubmitState()

  async function submit () {
    const current = form.value
    if (!current) {
      return
    }

    await run(async () => {
      await store.update<Row>(table, current.id, columnValues(current, schema))
      await router.push(`/${table}/${current.id}`)
    })
  }

  return { form, loading, loadError, submitting, error, submit }
}
