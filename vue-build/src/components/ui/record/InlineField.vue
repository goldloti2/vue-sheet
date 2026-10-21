<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import FieldInput from '@/components/ui/record/FieldInput.vue'
  import { validateRow } from '@/schema/validation'
  import { useTablesStore } from '@/stores/tables'

  // 詳細頁的快速編輯：一欄直接是輸入元件，改了就寫入 store。
  // 打字類的欄位先暫存，焦點離開或按 Enter 才寫入；其餘一改就寫入。驗證不過時不寫入，錯誤顯示於欄位下方
  const props = defineProps<{
    table: TableKey
    schema: TableSchema
    row: { id: string }
    column: SchemaColumn
  }>()

  const store = useTablesStore()

  const deferred = ['text', 'duration', 'image', 'number'].includes(props.column.type)
    || (props.column.type === 'select' && Boolean(props.column.allowCustom))

  const stored = computed(() => (props.row as Record<string, unknown>)[props.column.key])
  const draft = ref<unknown>(stored.value)
  const error = ref<string | null>(null)
  const focused = ref(false)

  // 快取中的值被別處改掉時，沒在輸入就跟著更新
  watch(stored, value => {
    if (!focused.value) {
      draft.value = value
      error.value = null
    }
  })

  function sameValue (a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }
    return a === b
  }

  function commit () {
    const key = props.column.key
    if (sameValue(draft.value, stored.value)) {
      error.value = null
      return
    }

    const errors = validateRow({ ...props.row, [key]: draft.value }, props.schema, [key])
    if (errors[key]) {
      error.value = errors[key]
      return
    }

    try {
      store.update(props.table, props.row.id, { [key]: draft.value })
      error.value = null
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : String(error_)
    }
  }

  // 沒有焦點時的變動（例如 −／＋、清除鈕）也立即寫入
  function onInput (value: unknown) {
    draft.value = value
    if (!deferred || !focused.value) {
      commit()
    }
  }

  function onFocused (value: boolean) {
    focused.value = value
    if (!value) {
      commit()
    }
  }

  // 輸入到一半就換頁或換筆時，元件被移除不一定觸發失焦，卸載前補寫一次
  onBeforeUnmount(() => {
    if (deferred) {
      commit()
    }
  })
</script>

<template>
  <!-- 擋下觸控事件，在輸入框中拖曳不會觸發詳細頁的左右滑動換筆 -->
  <div class="inline-field" @touchend.stop @touchmove.stop @touchstart.stop>
    <FieldInput
      :column="column"
      density="compact"
      :error-messages="error ?? []"
      hide-details="auto"
      :model-value="draft"
      :row="row"
      :schema="schema"
      variant="outlined"
      @keydown.enter="commit"
      @update:focused="onFocused"
      @update:model-value="onInput"
    />
  </div>
</template>

<style scoped>
.inline-field {
  min-width: 0;
}
</style>
