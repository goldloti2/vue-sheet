<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/DetailField.vue'
  import { formatColumnValue } from '@/schema/types'

  interface ExtraField {
    key: string
    label: string
    value: string
    to?: string
  }

  const props = defineProps<{
    schema: TableSchema
    row: object | null
    loading: boolean
    error: string | null
    // 不是 schema 真實欄位、只在這個畫面顯示用的欄位（例如跨表算出來的總額）；
    // 一樣可以透過 schema.detailOrder 安排跟真實欄位的顯示順序
    extraFields?: ExtraField[]
  }>()

  const fields = computed<ExtraField[]>(() => {
    const row = props.row
    if (!row) {
      return []
    }

    const realFields: ExtraField[] = props.schema.columns.map(column => {
      const value = formatColumnValue(row, column)
      const to = column.type === 'ref' && value ? `/${column.refTable}/${value}` : undefined
      return { key: column.key, label: column.label, value, to }
    })

    const allFields = [...realFields, ...(props.extraFields ?? [])]

    if (!props.schema.detailOrder) {
      return allFields
    }

    return props.schema.detailOrder
      .map(key => allFields.find(field => field.key === key))
      .filter((field): field is ExtraField => field !== undefined)
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
        :label="field.label"
        :to="field.to"
        :value="field.value"
      />
    </template>
  </v-container>
</template>
