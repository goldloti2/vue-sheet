<!-- 複製到 src/pages/__table__/[id]/index.vue
     版型（標頭、上一列與下一列、FAB、子表區塊的 slot）見 docs/components/page/DetailPage.md。
     欄位的顯示與欄位動作見 docs/components/record/DataDetail.md -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import DetailPage from '@/components/ui/page/DetailPage.vue'
  import { useActions } from '@/composables/actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { defineView } from '@/schema/view'

  // 網址上的 id 與對應的列。載入狀態與左右滑動切換列皆由 DetailPage 處理
  const { id, row, loading, error } = useRecordPage('__table__')

  // 以列為參數的動作由 DetailPage 綁定至此列。刪除此列後自動離開
  const { delete: remove, edit } = useActions('__table__')

  // 選用：整頁最上方的標頭區塊。actions 為圖片下方的左右各兩格（見 docs/components/record/DetailHeader.md）
  const header = defineView('__table__', { title: 'name', subtitle: 'date' })
</script>

<template>
  <!-- 此表額外顯示的內容（例如子表區塊、說明）置於 default slot，scope 提供的 row 不為 null。
       子表區塊為 ChildList，其中放置導入的展開頁（child-list.vue），見 docs/components/page/ChildList.md。
       欄位動作以 field-actions 安排：欄位 key → 動作，例如 :field-actions="{ parent: goToParent }" -->
  <DetailPage
    :id="id"
    :app-bar="[remove]"
    :error="error"
    :fab="[edit]"
    :header="header"
    :loading="loading"
    :row="row"
    table="__table__"
  />
</template>
