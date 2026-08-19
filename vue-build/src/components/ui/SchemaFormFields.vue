<script lang="ts" setup>
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'

  const props = defineProps<{
    schema: TableSchema
  }>()

  // 跟 SchemaDetailFields 一樣用 object，實際存取時再轉型（見 schema/types.ts 的 formatColumnValue）
  const model = defineModel<object>({ required: true })

  const orderedColumns = computed<SchemaColumn[]>(() => {
    if (!props.schema.formOrder) {
      return props.schema.columns
    }

    return props.schema.formOrder
      .map(key => props.schema.columns.find(column => column.key === key))
      .filter((column): column is SchemaColumn => column !== undefined)
  })

  function fieldValue (column: SchemaColumn): string | number | Date | null {
    return (model.value as Record<string, unknown>)[column.key] as string | number | Date | null
  }

  function setFieldValue (column: SchemaColumn, value: string | number | Date | null) {
    model.value = { ...model.value, [column.key]: value }
  }

  function numberValue (column: SchemaColumn): number | null {
    return fieldValue(column) as number | null
  }

  function dateValue (column: SchemaColumn): Date | null {
    return fieldValue(column) as Date | null
  }

  function textValue (column: SchemaColumn): string | null {
    return fieldValue(column) as string | null
  }

  function setTextValue (column: SchemaColumn, value: string) {
    setFieldValue(column, value === '' ? null : value)
  }
</script>

<template>
  <v-container class="schema-form-fields">
    <template v-for="column in orderedColumns" :key="column.key">
      <v-number-input
        v-if="column.type === 'number'"
        :label="column.label"
        :model-value="numberValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <v-date-input
        v-else-if="column.type === 'date'"
        input-format="yyyy/mm/dd"
        :label="column.label"
        :model-value="dateValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <!-- text、ref 都先用純輸入欄；ref 之後再考慮換成關聯資料的選擇器 -->
      <v-text-field
        v-else
        :label="column.label"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />
    </template>
  </v-container>
</template>
