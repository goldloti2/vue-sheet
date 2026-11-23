<script lang="ts" setup generic="Row extends { id: string }">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { MultiSelect } from '@/composables/list/useMultiSelect'
  import type { TableKey } from '@/schema'
  import type { RowGroup } from '@/schema/group'
  import type { CardView, ListItemKind, RowView } from '@/schema/view'
  import type { Component } from 'vue'
  import { computed, watch } from 'vue'
  import DataCard from '@/components/ui/list/DataCard.vue'
  import DataGallery from '@/components/ui/list/DataGallery.vue'
  import DataList from '@/components/ui/list/DataList.vue'
  import DataProfile from '@/components/ui/list/DataProfile.vue'
  import GroupedList from '@/components/ui/list/GroupedList.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { provideListOrder } from '@/composables/navigation/useListOrder'
  import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'
  import { usePanelFullPage, usePanelVisible } from '@/composables/shell/usePanelActive'
  import { schemas } from '@/schema'
  import { flattenGroups } from '@/schema/group'
  import { fitsView } from '@/schema/view'

  const props = defineProps<{
    table: TableKey
    // 已篩選、搜尋的列，即畫面上實際顯示的順序。分組的列表改為提供 groups
    rows?: Row[]
    // 分組（groupRows 的結果），與 rows 擇一提供
    groups?: RowGroup<Row>[]
    loading?: boolean
    error?: string | null
    // 提供時才綁定長按多選（useListPage 的 selection）
    selection?: MultiSelect
    // 右下角的 FAB，通常為新增
    fab?: (PageAction | null)[]
    // 每一列的連結。省略時不可點擊
    rowTo?: (row: Row) => string
  } & (
    // 每一列的版面與各位置的欄位，兩者一起提供。card 使用 defineCardView，其他使用 defineView
    | { item: 'list' | 'profile' | 'gallery', view: RowView<Row> }
    | { item: 'card', view: CardView<Row> }
    // 以 slot 呈現時不提供 view。default slot 的 item 只決定各列的排法
    | { item?: ListItemKind, view?: undefined }
  )>()

  defineSlots<{
    // 自訂每一列，取代 item 與 view。props 為每一列的多選綁定
    default?: (slotProps: { row: Row, props: object }) => unknown
    // 一次提供全部的列，用於表格式列表。提供此 slot 時不使用 default，也沒有多選綁定
    rows?: (slotProps: { rows: Row[] }) => unknown
  }>()

  // 畫面上實際的順序，點擊一列時發布，詳細頁的上一列、下一列依此切換。分組時以攤平後的順序為準
  const shown = computed<Row[]>(() => props.groups ? flattenGroups(props.groups) : props.rows ?? [])
  provideListOrder(props.table, () => shown.value.map(row => row.id))

  // dashboard 的面板中，輸出列出的列。頁籤中的列表只在目前的頁籤時輸出，載入中不輸出
  // 刻意用 watch 而非 watchEffect：回呼不追蹤面板的輸出，同一個面板中的兩個列表不會互相觸發
  const panel = useDashboardPanel()
  const visible = usePanelVisible()
  if (panel) {
    watch([visible, () => props.loading, shown], ([isVisible, loading, rows]) => {
      if (isVisible && !loading) {
        panel.show(props.table, rows.map(row => row.id))
      }
    }, { immediate: true })
  }

  // 每一列的綁定：多選、面板的 mark，加上面板開啟 selects 時的選取（標示選取的那一列，未展開時點擊改為選取）
  const fullPage = usePanelFullPage()
  function rowProps (id: string): object {
    const marked = panel?.marked(id) ? { marked: true } : {}
    const picks = panel?.selects() && !fullPage.value
    const linked = panel?.selects()
      ? { current: panel.selected() === id, ...(picks ? { pickable: true, onPick: () => panel.toggle(id) } : {}) }
      : {}
    return { ...props.selection?.itemProps(id), ...marked, ...linked }
  }

  // 每一列的元件，prop 皆為 row、view、to 與 rowProps
  const ITEMS: Record<ListItemKind, Component> = { list: DataList, profile: DataProfile, gallery: DataGallery, card: DataCard }
  const item = computed<ListItemKind>(() => props.item ?? 'list')
  const layout = computed(() => item.value === 'gallery' ? 'grid' : 'list')

  function itemProps (row: Row): object {
    return { ...rowProps(row.id), row, view: props.view, to: props.rowTo?.(row) }
  }

  if (import.meta.env.DEV) {
    watch([item, () => props.view], ([kind, view]) => {
      if (view && !fitsView(kind, view)) {
        console.warn(`ListPage（${schemas[props.table].tableLabel}）：item 為 ${kind} 時，view 須以 ${kind === 'card' ? 'defineCardView' : 'defineView'} 定義`)
      }
    }, { immediate: true })
  }
</script>

<template>
  <div>
    <v-container class="list-page__container">
      <PageState :error="error" :loading="loading" spinner="linear">
        <GroupedList v-if="groups" :groups="groups" :layout="layout">
          <template #default="{ row }">
            <slot :props="rowProps(row.id)" :row="row">
              <component :is="ITEMS[item]" v-if="view" v-bind="itemProps(row)" />
            </slot>
          </template>
        </GroupedList>

        <slot v-else-if="$slots.rows" name="rows" :rows="rows ?? []" />

        <ListLayout v-else :layout="layout">
          <template v-for="row in rows" :key="row.id">
            <slot :props="rowProps(row.id)" :row="row">
              <component :is="ITEMS[item]" v-if="view" v-bind="itemProps(row)" />
            </slot>
          </template>
        </ListLayout>
      </PageState>
    </v-container>

    <PageFab :actions="fab ?? []" />
  </div>
</template>

<style scoped>
/* 列表本身不留白，由內容決定：list 式的列、分組的標題與表格貼齊外緣，卡片四周留白（見 docs/design/list.md） */
.list-page__container {
  padding: 0;
}
</style>
