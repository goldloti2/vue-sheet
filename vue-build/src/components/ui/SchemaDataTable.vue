<script generic="Row extends { id: string }" lang="ts" setup>
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { formatColumnValue } from '@/schema/types'

  const props = withDefaults(defineProps<{
    rows: readonly Row[]
    schema: TableSchema
    // 要顯示的欄位 key 子集；省略＝顯示 schema 全部欄位
    columns?: string[]
    showHeader?: boolean
    // 有傳的話點一列會導覽過去；不傳就是純顯示，不用猜路由規則
    rowTo?: (row: Row) => string
  }>(), {
    showHeader: true,
  })

  const router = useRouter()

  const visibleColumns = computed<SchemaColumn[]>(() => {
    if (!props.columns) {
      return props.schema.columns
    }

    return props.columns
      .map(key => props.schema.columns.find(column => column.key === key))
      .filter((column): column is SchemaColumn => column !== undefined)
  })

  function handleRowClick (row: Row) {
    if (props.rowTo) {
      router.push(props.rowTo(row))
    }
  }
</script>

<template>
  <v-table gridlines="all" :hover="!!rowTo">
    <thead v-if="showHeader">
      <tr>
        <th v-for="column in visibleColumns" :key="column.key">{{ column.label }}</th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="row in rows"
        :key="row.id"
        :class="{ 'cursor-pointer': rowTo }"
        @click="handleRowClick(row)"
      >
        <td v-for="column in visibleColumns" :key="column.key">{{ formatColumnValue(row, column) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>
