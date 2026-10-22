<script generic="Row extends { id: string }" lang="ts" setup>
  import type { DisplayValue } from '@/schema/format'
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import { displayValue } from '@/schema/format'
  import { allColumns } from '@/schema/types'

  interface ResolvedColumn<Row> {
    key: string
    label: string
    getValue: (row: Row) => DisplayValue
  }

  const props = withDefaults(defineProps<{
    rows: readonly Row[]
    schema: TableSchema
    // 要顯示的欄位 key 子集（真實欄位與 virtualColumns 都可以）；省略＝全部
    columns?: string[]
    showHeader?: boolean
    // 有傳的話點一列會導覽過去；不傳就是純顯示，不用猜路由規則
    rowTo?: (row: Row) => string
  }>(), {
    showHeader: true,
  })

  const router = useRouter()

  const resolvedColumns = computed<ResolvedColumn<Row>[]>(() => {
    const columnList: ResolvedColumn<Row>[] = allColumns(props.schema).map(column => ({
      key: column.key,
      label: column.label,
      getValue: (row: Row) => displayValue(row, props.schema, column),
    }))

    if (!props.columns) {
      return columnList
    }

    return props.columns
      .map(key => columnList.find(column => column.key === key))
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
        <td v-for="column in resolvedColumns" :key="column.key"><FormattedValue :value="column.getValue(row)" /></td>
      </tr>
    </tbody>
  </v-table>
</template>
