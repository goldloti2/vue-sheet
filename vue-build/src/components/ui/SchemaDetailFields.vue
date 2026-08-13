<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import DetailField from '@/components/ui/DetailField.vue'
  import { detailColumns, formatColumnValue } from '@/schema/types'

  interface SchemaDetailFieldsProps {
    schema: TableSchema
    row: object | null
    loading: boolean
    error: string | null
  }

  defineProps<SchemaDetailFieldsProps>()
</script>

<template>
  <v-container>
    <v-progress-circular v-if="loading" indeterminate />

    <v-alert v-else-if="error" :text="error" type="error" />

    <v-alert v-else-if="!row" text="找不到這筆資料" type="warning" />

    <template v-else>
      <DetailField
        v-for="column in detailColumns(schema)"
        :key="column.key"
        :label="column.label"
        :value="formatColumnValue(row, column)"
      />
    </template>
  </v-container>
</template>
