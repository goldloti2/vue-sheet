<script lang="ts" setup generic="Row extends object">
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { DetailFieldLayout } from '@/config/app'
  import type { TableKey } from '@/schema'
  import type { RowKey, TableSchema } from '@/schema/types'
  import type { RowView } from '@/schema/view'
  import { computed } from 'vue'
  import { Touch as vTouch } from 'vuetify/directives'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataDetail from '@/components/ui/record/DataDetail.vue'
  import DetailHeader from '@/components/ui/record/DetailHeader.vue'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'
  import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'
  import { usePanelFullPage } from '@/composables/shell/usePanelActive'

  defineSlots<{
    // 這張表額外要放的東西，擺在欄位下面。兩個 slot 都是資料到手才渲染，所以 row 一定不是 null
    default?: (props: { row: Row }) => unknown
    // 同上，但擺在欄位上面（子表才是主體、欄位只是附註的頁面用）
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
    // 欄位 key → 動作，每欄一個（見 DataDetail）
    fieldActions?: FieldActions<Row>
    // 快速編輯的欄位：直接是輸入元件，改了即寫入（見 DataDetail）
    editable?: readonly RowKey<Row>[]
    // 右下角的 FAB，通常是編輯
    fab?: (PageAction | null)[]
    // 選用：整頁最上方的標頭區塊（defineView，見 DetailHeader）
    header?: RowView<Row>
    // 欄位的排法，覆寫 config/app.ts 的 detailFieldLayout（見 DetailField）
    layout?: DetailFieldLayout
  }>()

  // 左右滑動換上下一筆；RecordNav 的兩顆箭頭是同一份順序。兩者皆只在以整頁呈現時啟用（dashboard 的面板中停用）
  const { swipe } = useSiblingNav(props.table, () => props.id)
  const fullPage = usePanelFullPage()

  // dashboard 的詳細面板尚無選取時，只顯示欄位名稱，不顯示「找不到這筆資料」
  const dashboard = useDashboardSelection()
  const blank = computed(() => dashboard !== null && !props.id)
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
      <!-- PageState 已經擋掉 null 了，這層只是讓型別看得出來 -->
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

        <!-- 這張表額外要放的東西：子表、說明、圖表… -->
        <slot :row="row" />
      </template>
    </PageState>

    <RecordNav v-if="fullPage" :id="id" :table="table" />

    <PageFab :actions="fab ?? []" />
  </div>
</template>
