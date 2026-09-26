<script lang="ts" setup generic="Row extends { id: string }">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { MultiSelect } from '@/composables/list/useMultiSelect'
  import type { TableKey } from '@/schema'
  import PageState from '@/components/ui/page/PageState.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useListOrder } from '@/composables/navigation/useListOrder'

  const props = defineProps<{
    table: TableKey
    // 已經篩選、搜尋過的那些，也就是畫面上實際顯示的順序
    rows: Row[]
    loading?: boolean
    error?: string | null
    // 有給才綁長按多選（useListPage 的 selection）
    selection?: MultiSelect
    // 右下角的 FAB，通常是新增
    fab?: PageAction[]
  }>()

  defineSlots<{
    // props 是每一列的多選綁定，直接 v-bind 到 DataList 上
    default?: (slotProps: { row: Row, props: object }) => unknown
  }>()

  // 畫面上實際的順序，detail 頁的上/下一筆靠它。分組或分頁籤的列表自己發布（見 docs/components/ListPage.md）
  useListOrder(props.table, () => props.rows.map(row => row.id))
</script>

<template>
  <div>
    <v-container>
      <PageState :error="error" :loading="loading" spinner="linear">
        <template v-for="row in rows" :key="row.id">
          <slot :props="selection?.itemProps(row.id) ?? {}" :row="row" />
        </template>
      </PageState>
    </v-container>

    <PageFab :actions="fab ?? []" />
  </div>
</template>
