<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { AnyColumn, SchemaColumn, TableSchema, VirtualColumn } from '@/schema/types'
  import { mdiLockOutline } from '@mdi/js'
  import { computed } from 'vue'
  import FieldInput from '@/components/ui/record/FieldInput.vue'
  import { schemas } from '@/schema'
  import { allColumns, formatColumnValue } from '@/schema/types'
  import { useTablesStore } from '@/stores/tables'

  const props = defineProps<{
    schema: TableSchema
    errors?: Record<string, string>
    // 這一頁的欄位順序，覆寫 schema 的 formOrder
    order?: readonly string[]
    // 只顯示這幾個欄位（順序仍照 order／formOrder）；省略就是全部
    only?: readonly string[]
    // 修改既有的列時為 true：主鍵那一欄唯讀
    lockId?: boolean
  }>()

  // 用 object，實際存取時再轉型（見 schema/types.ts 的 formatColumnValue）
  const model = defineModel<object>({ required: true })

  // order 優先於 formOrder，皆可排進虛擬欄位（唯讀顯示）；兩者皆省略時只有真實欄位
  const orderedColumns = computed<AnyColumn[]>(() => {
    const order = props.order ?? props.schema.formOrder
    const columns = order
      ? order
        .map(key => allColumns(props.schema).find(column => column.key === key))
        .filter((column): column is AnyColumn => column !== undefined)
      : props.schema.columns

    return props.only ? columns.filter(column => props.only?.includes(column.key)) : columns
  })

  function isVirtual (column: AnyColumn): column is VirtualColumn {
    return 'value' in column
  }

  function fieldValue (column: SchemaColumn): unknown {
    return (model.value as Record<string, unknown>)[column.key]
  }

  function setFieldValue (column: SchemaColumn, value: unknown) {
    model.value = { ...model.value, [column.key]: value }
  }

  // 唯讀的欄位：虛擬欄位與建立後的主鍵
  function isLocked (column: AnyColumn): boolean {
    return isVirtual(column) || (column.key === props.schema.idColumn && Boolean(props.lockId))
  }

  // 必填的欄位：標了 required 者，以及沒有 newId 的主鍵；唯讀的欄位不算
  function isRequired (column: AnyColumn): boolean {
    if (isVirtual(column) || isLocked(column)) {
      return false
    }
    return Boolean(column.required) || (column.key === props.schema.idColumn && !props.schema.newId)
  }

  // 各欄共用的屬性：標籤、錯誤訊息，以及唯讀（虛擬欄位、建立後的主鍵）與主鍵的提示。
  // 唯讀時字色變淡，仍可選取複製；建立後的主鍵另加鎖頭
  function fieldProps (column: AnyColumn) {
    const isId = column.key === props.schema.idColumn
    const idLocked = isId && props.lockId
    const locked = isLocked(column)
    return {
      errorMessages: props.errors?.[column.key] ?? [],
      label: column.label,
      readonly: locked,
      class: { 'data-form__locked': locked },
      prependInnerIcon: idLocked ? mdiLockOutline : undefined,
      hint: isId && !props.lockId && props.schema.newId ? '留空即自動產生' : undefined,
      persistentHint: isId,
    }
  }

  // 虛擬欄位與 suggestedValues 讀的列：表單的 row 是普通複本，先掛上與快取相同的 getter，讀父列的值才算得出來，並隨輸入重算
  const store = useTablesStore()
  const ownTable = (Object.keys(schemas) as TableKey[]).find(key => schemas[key] === props.schema)
  const rowWithGetters = computed(() => ownTable ? store.withGetters(ownTable, model.value) : model.value)

  function virtualText (column: VirtualColumn): string {
    return formatColumnValue(rowWithGetters.value, column)
  }
</script>

<template>
  <v-container class="schema-form-fields">
    <template v-for="column in orderedColumns" :key="column.key">
      <v-text-field
        v-if="isVirtual(column)"
        v-bind="fieldProps(column)"
        :model-value="virtualText(column)"
      />

      <FieldInput
        v-else
        v-bind="fieldProps(column)"
        :column="column"
        :model-value="fieldValue(column)"
        :required="isRequired(column)"
        :row="rowWithGetters"
        :schema="schema"
        @update:model-value="(value) => setFieldValue(column, value)"
      />
    </template>
  </v-container>
</template>

<style scoped>
/* 唯讀的欄位（虛擬欄位、建立後的主鍵）：值的字色變淡，與可編輯的欄位區分 */
.data-form__locked :deep(.v-field__input) {
  opacity: var(--v-medium-emphasis-opacity);
}
</style>
