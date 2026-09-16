<script generic="Row extends { id: string }" lang="ts" setup>
  import type { TableKey } from '@/schema'
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useRowFields } from '@/composables/useRowFields'
  import { schemas } from '@/schema'
  import { formatColumnValue } from '@/schema/types'

  interface ResolvedColumn<Row> {
    key: string
    label: string
    getValue: (row: Row) => string
  }

  const props = withDefaults(defineProps<{
    rows: readonly Row[]
    table: TableKey
    // 要顯示的欄位 key 子集（真實欄位與 virtualColumns 都可以）；省略＝全部真實欄位 + 全部虛擬欄位
    columns?: string[]
    showHeader?: boolean
    // 有傳的話點一列會導覽過去；不傳就是純顯示，不用猜路由規則
    rowTo?: (row: Row) => string
  }>(), {
    showHeader: true,
  })

  const router = useRouter()
  const schema = schemas[props.table]
  const { field } = useRowFields(props.table)

  const resolvedColumns = computed<ResolvedColumn<Row>[]>(() => {
    const realColumns: ResolvedColumn<Row>[] = schema.columns.map(column => ({
      key: column.key,
      label: column.label,
      getValue: (row: Row) => formatColumnValue(row, column),
    }))

    const virtualColumns: ResolvedColumn<Row>[] = (schema.virtualColumns ?? []).map(column => ({
      key: column.key,
      label: column.label,
      getValue: (row: Row) => field(row, column.key),
    }))

    const allColumns = [...realColumns, ...virtualColumns]

    if (!props.columns) {
      return allColumns
    }

    return props.columns
      .map(key => allColumns.find(column => column.key === key))
      .filter((column): column is ResolvedColumn<Row> => column !== undefined)
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
        <th v-for="column in resolvedColumns" :key="column.key">{{ column.label }}</th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="row in rows"
        :key="row.id"
        :class="{ 'cursor-pointer': rowTo }"
        @click="handleRowClick(row)"
      >
        <td v-for="column in resolvedColumns" :key="column.key">{{ column.getValue(row) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>
