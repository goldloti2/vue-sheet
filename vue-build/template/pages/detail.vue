<!-- 複製到 src/pages/__table__/[id]/index.vue
     版型（標頭、上下筆、FAB、slot 放子表格）見 docs/components/DetailPage.md；
     欄位怎麼顯示、欄位動作見 docs/components/DataDetail.md -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import DetailPage from '@/components/ui/page/DetailPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useRowAction } from '@/composables/actions/useTableActions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  // 網址上的 id + 那一筆；載入狀態與左右滑動換筆都由 DetailPage 處理
  const { id, row, loading, error } = useRecordPage<__Table__Row>('__table__')

  // 以列為參數的動作以 useRowAction 綁定至這一筆；刪除這一筆後會自動離開
  const { delete: remove, edit, fieldActions } = use__Table__Actions()
  const editAction = useRowAction(row, edit)
  const deleteAction = useRowAction(row, remove)
  useAppBarActions(() => [deleteAction.value])

  // 選用：整頁最上方的標頭區塊。有圖片欄位時指定 image；
  // actions 為圖片下方的左右各兩格，null 保留為空格（見 docs/components/DetailHeader.md）
  const header = defineView(__table__Schema, { title: 'name', subtitle: 'date' })
</script>

<template>
  <!-- 這張表額外要顯示的東西（子表格、說明…）放進 default slot，scope 給的 row 已經不是 null -->
  <DetailPage
    :id="id"
    :error="error"
    :fab="[editAction]"
    :field-actions="fieldActions"
    :header="header"
    :loading="loading"
    :row="row"
    :schema="__table__Schema"
    table="__table__"
  />
</template>
