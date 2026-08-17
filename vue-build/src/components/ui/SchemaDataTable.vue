<script generic="Row extends { id: string }" lang="ts" setup>
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { formatColumnValue } from '@/schema/types'

  const props = withDefaults(defineProps<{
    rows: readonly Row[]
    schema: TableSchema
    // 要顯示的欄位 key 子集；省略＝顯示 schema 全部欄位
    columns?: string[]
    showHeader?: boolean
  }>(), {
    showHeader: true,
  })

  const visibleColumns = computed<SchemaColumn[]>(() => {
    if (!props.columns) {
      return props.schema.columns
    }

    return props.columns
      .map(key => props.schema.columns.find(column => column.key === key))
      .filter((column): column is SchemaColumn => column !== undefined)
  })
</script>

<template>
  <v-table>
    <thead v-if="showHeader">
      <tr>
        <th v-for="column in visibleColumns" :key="column.key">{{ column.label }}</th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <td v-for="column in visibleColumns" :key="column.key">{{ formatColumnValue(row, column) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>
