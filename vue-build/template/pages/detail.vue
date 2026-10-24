<!-- 複製到 src/pages/__table__/[id]/index.vue
     版型（標頭、上一列與下一列、FAB、子表格的 slot）見 docs/components/page/DetailPage.md。
     欄位的顯示與欄位動作見 docs/components/record/DataDetail.md -->
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

  // 網址上的 id 與對應的列。載入狀態與左右滑動切換列皆由 DetailPage 處理
  const { id, row, loading, error } = useRecordPage<__Table__Row>('__table__')

  // 以列為參數的動作以 useRowAction 綁定至此列。刪除此列後自動離開
  const { delete: remove, edit, fieldActions } = use__Table__Actions()
  const editAction = useRowAction(row, edit)
  const deleteAction = useRowAction(row, remove)
  useAppBarActions(() => [deleteAction.value])

  // 選用：整頁最上方的標頭區塊。actions 為圖片下方的左右各兩格（見 docs/components/record/DetailHeader.md）
  const header = defineView(__table__Schema, { title: 'name', subtitle: 'date' })
</script>

<template>
  <!-- 此表額外顯示的內容（例如子表格、說明）置於 default slot，scope 提供的 row 不為 null -->
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
