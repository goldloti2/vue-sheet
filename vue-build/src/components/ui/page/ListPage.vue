<script lang="ts" setup generic="Row extends { id: string }">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { MultiSelect } from '@/composables/list/useMultiSelect'
  import type { TableKey } from '@/schema'
  import type { RowGroup } from '@/schema/group'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/list/GroupedList.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useListOrder } from '@/composables/navigation/useListOrder'
  import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'
  import { flattenGroups } from '@/schema/group'

  const props = defineProps<{
    table: TableKey
    // 已經篩選、搜尋過的那些，也就是畫面上實際顯示的順序。分組的列表改給 groups
    rows?: Row[]
    // 分組（groupRows 的結果），跟 rows 二選一
    groups?: RowGroup<Row>[]
    loading?: boolean
    error?: string | null
    // 有給才綁長按多選（useListPage 的 selection）
    selection?: MultiSelect
    // 右下角的 FAB，通常是新增
    fab?: (PageAction | null)[]
    // 各筆的排法：list 依序往下排（預設），grid 為格狀排列（gallery）
    layout?: 'list' | 'grid'
  }>()

  defineSlots<{
    // props 是每一列的多選綁定，直接 v-bind 到 DataList 上
    default?: (slotProps: { row: Row, props: object }) => unknown
    // 整批一次給（表格式列表用）。有這個 slot 就不走上面那個，也沒有多選綁定
    rows?: (slotProps: { rows: Row[] }) => unknown
  }>()

  // 畫面上實際的順序，detail 頁的上/下一筆靠它。分組的話攤平才是真正的先後
  const shown = computed<Row[]>(() => props.groups ? flattenGroups(props.groups) : props.rows ?? [])
  useListOrder(props.table, () => shown.value.map(row => row.id))

  // 每一列的綁定：多選，加上 dashboard 開啟互動時的選取（點擊改為選取、標示選取的那一列）
  const dashboard = useDashboardSelection()
  function rowProps (id: string): object {
    const linked = dashboard?.interactive()
      ? { current: dashboard.selectedId(props.table) === id, pickable: true, onPick: () => dashboard.toggle(props.table, id) }
      : {}
    return { ...props.selection?.itemProps(id), ...linked }
  }
</script>

<template>
  <div>
    <v-container class="list-page__container">
      <PageState :error="error" :loading="loading" spinner="linear">
        <GroupedList v-if="groups" :groups="groups" :layout="layout">
          <template #default="{ row }">
            <slot :props="rowProps(row.id)" :row="row" />
          </template>
        </GroupedList>

        <slot v-else-if="$slots.rows" name="rows" :rows="rows ?? []" />

        <ListLayout v-else :layout="layout">
          <template v-for="row in rows" :key="row.id">
            <slot :props="rowProps(row.id)" :row="row" />
          </template>
        </ListLayout>
      </PageState>
    </v-container>

    <PageFab :actions="fab ?? []" />
  </div>
</template>

<style scoped>
/* 列表元件以 cqw 依寬度估計畫面外各列的高度（見 DataCard），以內容區為準；不具名，不影響 dashboard 的窄版判斷 */
.list-page__container {
  container-type: inline-size;
}
</style>
