<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/DetailField.vue'
  import { allColumns, formatColumnValue } from '@/schema/types'

  interface Field {
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
  }>()

  // 真實與虛擬欄位一視同仁，照 detailOrder 排；ref 欄位變成連到對方 detail 的連結
  const fields = computed<Field[]>(() => {
    const row = props.row
    if (!row) {
      return []
    }

    const fieldList: Field[] = allColumns(props.schema).map(column => {
      const value = formatColumnValue(row, column)
      const to = column.type === 'ref' && value ? `/${column.refTable}/${value}` : undefined
      return { key: column.key, label: column.label, value, to }
    })

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
        :label="field.label"
        :to="field.to"
        :value="field.value"
      />
    </template>
  </v-container>
</template>
