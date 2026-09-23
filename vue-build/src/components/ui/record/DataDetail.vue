<script lang="ts" setup>
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/record/DetailField.vue'
  import { imageSrc } from '@/schema/image'
  import { allColumns, formatColumnValue } from '@/schema/types'

  interface Field {
    key: string
    label: string
    value: string
    image?: string | null
    action?: PageAction
  }

  const props = defineProps<{
    schema: TableSchema
    row: object | null
    loading: boolean
    error: string | null
    // 欄位 key → 動作；每欄只用第一個。沒列的欄位就沒有動作，ref 的前往也要自己列（useGoToRefAction）
    fieldActions?: FieldActions
  }>()

  // 真實與虛擬欄位一視同仁，照 detailOrder 排
  const fields = computed<Field[]>(() => {
    const row = props.row
    if (!row) {
      return []
    }

    const fieldList: Field[] = allColumns(props.schema).map(column => ({
      key: column.key,
      label: column.label,
      value: formatColumnValue(row, column),
      image: column.type === 'image' ? imageSrc((row as Record<string, unknown>)[column.key]) : null,
      action: props.fieldActions?.[column.key]?.value[0],
    }))

    if (!props.schema.detailOrder) {
      return fieldList
    }

    return props.schema.detailOrder
      .map(key => fieldList.find(candidate => candidate.key === key))
      .filter((candidate): candidate is Field => candidate !== undefined)
  })
</script>

<template>
  <v-container>
    <v-progress-circular v-if="loading" indeterminate />

    <v-alert v-else-if="error" :text="error" type="error" />

    <v-alert v-else-if="!row" text="找不到這筆資料" type="warning" />

    <template v-else>
      <DetailField
        v-for="field in fields"
        :key="field.key"
        :action="field.action"
        :image="field.image"
        :label="field.label"
        :value="field.value"
      />
    </template>
  </v-container>
</template>
