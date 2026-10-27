<script generic="Row extends { id: string }" lang="ts" setup>
  import type { ColumnWidth } from '@/composables/list/useColumnWidths'
  import type { DisplayValue } from '@/schema/format'
  import type { TableSchema } from '@/schema/types'
  import { computed, useTemplateRef } from 'vue'
  import { useRouter } from 'vue-router'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import { useColumnWidths } from '@/composables/list/useColumnWidths'
  import { usePublishListOrder } from '@/composables/navigation/useListOrder'
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
    // 要顯示的欄位 key，真實欄位與虛擬欄位皆可。省略時為全部
    columns?: string[]
    showHeader?: boolean
    // 提供時，點擊一列即導覽。未提供時為純顯示
    rowTo?: (row: Row) => string
    // 欄寬：欄位 key → 'max'／'default'／'min'，未列出的欄為 'default'
    widths?: Partial<Record<string, ColumnWidth>>
    // 放不下的格子換行，而非截斷加上省略號
    wrap?: boolean
    // 橫向捲動時固定於左側的欄數（自第一欄起）
    fixed?: number
  }>(), {
    showHeader: true,
    wrap: false,
    fixed: 0,
  })

  const router = useRouter()
  const publishOrder = usePublishListOrder()

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

  // 各欄寬度的加總超過可用寬度時依加總（可橫向捲動），否則撐滿
  const tableWidth = computed(() => {
    const widths = columnWidths.value
    if (!widths || !container.value) {
      return undefined
    }
    const total = widths.reduce((sum, width) => sum + width, 0)
    return total > container.value.clientWidth ? `${total}px` : '100%'
  })

  // 固定欄的 class 與位置，依欄的順序。左側位置為前面各欄寬度的加總
  const cellAttrs = computed(() => {
    const widths = columnWidths.value
    const count = Math.min(props.fixed, resolvedColumns.value.length)
    let left = 0
    return resolvedColumns.value.map((_, index) => {
      if (!widths || index >= count) {
        return {}
      }
      const attrs = {
        class: { 'data-table__fixed': true, 'data-table__fixed--last': index === count - 1 },
        style: { left: `${left}px` },
      }
      left += widths[index]
      return attrs
    })
  })

  function handleRowClick (row: Row) {
    if (props.rowTo) {
      publishOrder()
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
          <th v-for="(column, index) in resolvedColumns" :key="column.key" v-bind="cellAttrs[index]"><span class="data-table__content">{{ column.label }}</span></th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          :class="{ 'cursor-pointer': rowTo }"
          @click="handleRowClick(row)"
        >
          <td v-for="(column, index) in resolvedColumns" :key="column.key" v-bind="cellAttrs[index]"><span class="data-table__content"><FormattedValue :value="column.getValue(row)" /></span></td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
/* 固定欄寬：不換行，放不下時加上省略號 */
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

/* 固定欄：背景不透明，蓋住捲到下方的欄。最後一個固定欄的右側以較深的格線分隔 */
.data-table__fixed {
  position: sticky;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.data-table__fixed--last {
  border-right: thin solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 3));
}
</style>
