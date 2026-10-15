<script lang="ts" setup generic="Row extends object">
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { TableKey } from '@/schema'
  import type { TableSchema } from '@/schema/types'
  import type { RowView } from '@/schema/view'
  import { Touch as vTouch } from 'vuetify/directives'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataDetail from '@/components/ui/record/DataDetail.vue'
  import DetailHeader from '@/components/ui/record/DetailHeader.vue'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'
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
    // 欄位 key → 動作，每欄一個（見 DataDetail）
    fieldActions?: FieldActions<Row>
    // 右下角的 FAB，通常是編輯
    fab?: (PageAction | null)[]
    // 選用：整頁最上方的標頭區塊（defineView，見 DetailHeader）
    header?: RowView<Row>
  }>()

  // 左右滑動換上下一筆；RecordNav 的兩顆箭頭是同一份順序。兩者皆只在以整頁呈現時啟用（dashboard 的面板中停用）
  const { swipe } = useSiblingNav(props.table, () => props.id)
  const fullPage = usePanelFullPage()
</script>

<template>
  <div v-touch="fullPage ? swipe : {}">
    <PageState :empty="!row" :error="error" :loading="loading">
      <!-- PageState 已經擋掉 null 了，這層只是讓型別看得出來 -->
      <template v-if="row">
        <DetailHeader v-if="header" :row="row" :view="header" />

        <slot name="top" :row="row" />

        <DataDetail :field-actions="fieldActions" :row="row" :schema="schema" />

        <!-- 這張表額外要放的東西：子表、說明、圖表… -->
        <slot :row="row" />
      </template>
    </PageState>

    <RecordNav v-if="fullPage" :id="id" :table="table" />

    <PageFab :actions="fab ?? []" />
  </div>
</template>
