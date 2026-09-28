<script lang="ts" setup generic="Row extends object">
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { TableKey } from '@/schema'
  import type { TableSchema } from '@/schema/types'
  import { Touch as vTouch } from 'vuetify/directives'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataDetail from '@/components/ui/record/DataDetail.vue'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'

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
    // 欄位 key → 動作；每欄只用第一個（見 DataDetail）
    fieldActions?: FieldActions
    // 右下角的 FAB，通常是編輯
    fab?: PageAction[]
  }>()

  // 左右滑動換上下一筆；RecordNav 的兩顆箭頭是同一份順序
  const { swipe } = useSiblingNav(props.table, () => props.id)
</script>

<template>
  <div v-touch="swipe">
    <PageState :empty="!row" :error="error" :loading="loading">
      <!-- PageState 已經擋掉 null 了，這層只是讓型別看得出來 -->
      <template v-if="row">
        <slot name="top" :row="row" />

        <DataDetail :field-actions="fieldActions" :row="row" :schema="schema" />

        <!-- 這張表額外要放的東西：子表、說明、圖表… -->
        <slot :row="row" />
      </template>
    </PageState>

    <RecordNav :id="id" :table="table" />

    <PageFab :actions="fab ?? []" />
  </div>
</template>
