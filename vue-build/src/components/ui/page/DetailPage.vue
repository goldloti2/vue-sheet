<script lang="ts" setup generic="Row extends object">
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { DetailFieldLayout } from '@/config/app'
  import type { TableKey } from '@/schema'
  import type { RowKey, TableSchema } from '@/schema/types'
  import type { RowView } from '@/schema/view'
  import { computed, watch } from 'vue'
  import { Touch as vTouch } from 'vuetify/directives'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataDetail from '@/components/ui/record/DataDetail.vue'
  import DetailHeader from '@/components/ui/record/DetailHeader.vue'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'
  import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'
  import { usePanelFullPage, usePanelVisible } from '@/composables/shell/usePanelActive'

  defineSlots<{
    // 欄位下方額外放置的內容。兩個 slot 皆於資料取得後才顯示，row 不會是 null
    default?: (props: { row: Row }) => unknown
    // 欄位上方額外放置的內容，用於子表為主體的頁面
    top?: (props: { row: Row }) => unknown
  }>()

  const props = defineProps<{
    table: TableKey
    id: string
    schema: TableSchema
    row: Row | null
    loading?: boolean
    error?: string | null
    // 這一頁的欄位順序，覆寫 schema 的 detailOrder（見 DataDetail）
    order?: readonly RowKey<Row>[]
    // 欄位 key → 動作，每一欄一個（見 DataDetail）
    fieldActions?: FieldActions<Row>
    // 快速編輯的欄位：直接顯示為輸入元件，修改後即寫入（見 DataDetail）
    editable?: readonly RowKey<Row>[]
    // 右下角的 FAB，通常為編輯
    fab?: (PageAction | null)[]
    // 選用：整頁最上方的標頭區塊（defineView，見 DetailHeader）
    header?: RowView<Row>
    // 欄位的排法，覆寫 config/app.ts 的 detailFieldLayout（見 DetailField）
    layout?: DetailFieldLayout
  }>()

  // 左右滑動與 RecordNav 的箭頭使用同一份順序，只在整頁呈現時啟用，dashboard 的面板中停用
  const { swipe } = useSiblingNav(props.table, () => props.id)
  const fullPage = usePanelFullPage()

  // dashboard 的詳細面板沒有輸入時，只顯示欄位名稱，不顯示「找不到這一列」
  const panel = useDashboardPanel()
  const blank = computed(() => panel !== null && !props.id)

  // dashboard 的面板中，輸出顯示的那一列，沒有時為零列。頁籤中的詳細頁只在目前的頁籤時輸出，載入中不輸出
  const visible = usePanelVisible()
  if (panel) {
    watch([visible, () => props.loading, () => props.row ? props.id : null], ([isVisible, loading, shownId]) => {
      if (isVisible && !loading) {
        panel.show(props.table, shownId ? [shownId] : [])
      }
    }, { immediate: true })
  }
</script>

<template>
  <div v-touch="fullPage ? swipe : {}">
    <DataDetail
      v-if="blank"
      :layout="layout"
      :order="order"
      :row="null"
      :schema="schema"
    />

    <PageState v-else :empty="!row" :error="error" :loading="loading">
      <!-- PageState 已擋下 null，此層只用於縮小型別 -->
      <template v-if="row">
        <DetailHeader v-if="header" :row="row" :view="header" />

        <slot name="top" :row="row" />

        <DataDetail
          :editable="editable"
          :field-actions="fieldActions"
          :layout="layout"
          :order="order"
          :row="row"
          :schema="schema"
        />

        <!-- 這張表額外放置的內容，例如子表、說明、圖表 -->
        <slot :row="row" />
      </template>
    </PageState>

    <RecordNav v-if="fullPage" :id="id" :table="table" />

    <PageFab :actions="fab ?? []" />
  </div>
</template>
