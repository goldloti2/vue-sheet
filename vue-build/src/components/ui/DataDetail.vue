<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/DetailField.vue'
  import { useRowFields } from '@/composables/useRowFields'
  import { schemas } from '@/schema'
  import { formatColumnValue } from '@/schema/types'

  interface Field {
    key: string
    label: string
    value: string
    to?: string
  }

  const props = defineProps<{
    table: TableKey
    row: object | null
    loading: boolean
    error: string | null
  }>()

  const schema = schemas[props.table]
  const { field: fieldText } = useRowFields(props.table)

  // 真實欄位與虛擬欄位攤平，再照 detailOrder 排
  const fields = computed<Field[]>(() => {
    const row = props.row
    if (!row) {
      return []
    }

    const realFields: Field[] = schema.columns.map(column => {
      const value = formatColumnValue(row, column)
      const to = column.type === 'ref' && value ? `/${column.refTable}/${value}` : undefined
      return { key: column.key, label: column.label, value, to }
    })

    const virtualFields: Field[] = (schema.virtualColumns ?? []).map(column => ({
      key: column.key,
      label: column.label,
      value: fieldText(row, column.key),
    }))

    const allFields = [...realFields, ...virtualFields]

    if (!schema.detailOrder) {
      return allFields
    }

    return schema.detailOrder
      .map(key => allFields.find(candidate => candidate.key === key))
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
