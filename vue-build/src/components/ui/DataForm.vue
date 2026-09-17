<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { useTableList } from '@/composables/useTableList'
  import { schemas } from '@/schema'
  import { sortRows } from '@/schema/types'

  const props = defineProps<{
    schema: TableSchema
    errors?: Record<string, string>
    // 只顯示這幾個欄位（順序仍照 formOrder）；省略就是全部
    only?: readonly string[]
  }>()

  // 跟 DataDetail 一樣用 object，實際存取時再轉型（見 schema/types.ts 的 formatColumnValue）
  const model = defineModel<object>({ required: true })

  const orderedColumns = computed<SchemaColumn[]>(() => {
    const columns = props.schema.formOrder
      ? props.schema.formOrder
        .map(key => props.schema.columns.find(column => column.key === key))
        .filter((column): column is SchemaColumn => column !== undefined)
      : props.schema.columns

    return props.only ? columns.filter(column => props.only?.includes(column.key)) : columns
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

  function errorFor (column: SchemaColumn): string | string[] {
    return props.errors?.[column.key] ?? []
  }

  function numberBound (column: SchemaColumn, bound: 'min' | 'max'): number | undefined {
    return column.type === 'number' ? column[bound] : undefined
  }

  // ref 欄位的選項就是對方整張表（共用快取）：值是 id、文字是對方的 $label，照對方的 defaultSort 排
  const refLists = new Map(
    props.schema.columns
      .filter(column => column.type === 'ref')
      .map(column => [column.key, useTableList<{ id: string, $label: string }>(column.refTable as TableKey)] as const),
  )

  function refItems (column: SchemaColumn): { id: string, title: string }[] {
    if (column.type !== 'ref') {
      return []
    }
    const list = refLists.get(column.key)
    return list
      ? sortRows(list.data.value, schemas[column.refTable as TableKey]).map(row => ({ id: row.id, title: row.$label }))
      : []
  }

  function refLoading (column: SchemaColumn): boolean {
    return refLists.get(column.key)?.loading.value ?? false
  }
</script>

<template>
  <v-container class="schema-form-fields">
    <template v-for="column in orderedColumns" :key="column.key">
      <v-number-input
        v-if="column.type === 'number'"
        :error-messages="errorFor(column)"
        :label="column.label"
        :max="numberBound(column, 'max')"
        :min="numberBound(column, 'min')"
        :model-value="numberValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <v-date-input
        v-else-if="column.type === 'date'"
        :error-messages="errorFor(column)"
        input-format="yyyy/mm/dd"
        :label="column.label"
        :model-value="dateValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <v-select
        v-else-if="column.type === 'select'"
        :error-messages="errorFor(column)"
        :items="column.options"
        :label="column.label"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />

      <v-autocomplete
        v-else-if="column.type === 'ref'"
        clearable
        :error-messages="errorFor(column)"
        item-title="title"
        item-value="id"
        :items="refItems(column)"
        :label="column.label"
        :loading="refLoading(column)"
        :model-value="textValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <v-text-field
        v-else
        :error-messages="errorFor(column)"
        :label="column.label"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />
    </template>
  </v-container>
</template>
