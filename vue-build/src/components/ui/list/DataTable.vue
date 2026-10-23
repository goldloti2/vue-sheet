<script generic="Row extends { id: string }" lang="ts" setup>
  import type { ColumnWidth } from '@/composables/list/useColumnWidths'
  import type { DisplayValue } from '@/schema/format'
  import type { TableSchema } from '@/schema/types'
  import { computed, useTemplateRef } from 'vue'
  import { useRouter } from 'vue-router'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import { useColumnWidths } from '@/composables/list/useColumnWidths'
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
    // 欄寬：欄位 key → 'max'／'default'／'min'，沒列到的（包括省略整個設定時）為 'default'
    widths?: Partial<Record<string, ColumnWidth>>
    // 放不下的格子換行，而非截斷加上省略號
    wrap?: boolean
  }>(), {
    showHeader: true,
    wrap: false,
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

  const container = useTemplateRef<HTMLElement>('container')
  const columnModes = computed(() => resolvedColumns.value.map(column => props.widths?.[column.key] ?? 'default'))
  const { widths: columnWidths } = useColumnWidths(container, columnModes, () => [props.rows, resolvedColumns.value])

  // 各欄寬度加總比可用寬度寬時照加總（可橫向捲動），否則撐滿
  const tableWidth = computed(() => {
    const widths = columnWidths.value
    if (!widths || !container.value) {
      return undefined
    }
    const total = widths.reduce((sum, width) => sum + width, 0)
    return total > container.value.clientWidth ? `${total}px` : '100%'
  })

  function handleRowClick (row: Row) {
    if (props.rowTo) {
      router.push(props.rowTo(row))
    }
  }
</script>

<template>
  <!-- 各欄寬度由程式算好後以 colgroup 固定（見 useColumnWidths） -->
  <div ref="container">
    <v-table
      :class="{ 'data-table--sized': columnWidths, 'data-table--wrap': wrap }"
      gridlines="all"
      :hover="!!rowTo"
      :style="tableWidth ? { '--data-table-width': tableWidth } : undefined"
    >
      <colgroup v-if="columnWidths">
        <col v-for="(width, index) in columnWidths" :key="index" :style="{ width: `${width}px` }">
      </colgroup>

      <thead v-if="showHeader">
        <tr>
          <th v-for="column in resolvedColumns" :key="column.key"><span class="data-table__content">{{ column.label }}</span></th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          :class="{ 'cursor-pointer': rowTo }"
          @click="handleRowClick(row)"
        >
          <td v-for="column in resolvedColumns" :key="column.key"><span class="data-table__content"><FormattedValue :value="column.getValue(row)" /></span></td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
/* 固定欄寬：不換行，放不下的加上省略號 */
.data-table--sized :deep(table) {
  width: var(--data-table-width, 100%);
  table-layout: fixed;
}

.data-table--sized th,
.data-table--sized td {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 換行：最大欄的寬度即為內容寬，不會換行 */
.data-table--sized.data-table--wrap th,
.data-table--sized.data-table--wrap td {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
