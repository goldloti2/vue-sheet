<!-- 選用：以 card 呈現的列表頁，同樣複製到 src/pages/__table__/index.vue
     卡片的四層與動作的呈現見 docs/components/list/DataCard.md；
     搜尋、篩選、多選、分組與頁籤見 docs/ui.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import DataCard from '@/components/ui/list/DataCard.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineCardView } from '@/schema/view'

  // 整表 → 篩選 → 搜尋（放大鏡、篩選與排序鈕自動登記到 App Bar）+ 長按多選
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema)

  // 不要多選就不傳 selectedIds / onDone，也不用把 selection 交給 ListPage
  const { new: newAction, bulkDelete, edit, delete: remove } = use__Table__Actions({
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => [bulkDelete.value])

  // header 為第 1 層（image 為頭像），body 為第 2、3 層（image 為大圖），有圖片欄位時指定 image；
  // actions 為第 4 層：前兩個靠左、後兩個靠右，null 保留為空格
  const view = defineCardView(__table__Schema, {
    header: { title: 'name' },
    body: { subtitle: 'date', summary: 'amount' },
    actions: row => [{ ...edit(row), display: 'text' }, null, null, remove(row)],
  })
</script>

<template>
  <!-- 載入狀態、FAB、列表順序（detail 頁的上/下一筆）都由 ListPage 處理 -->
  <ListPage
    :error="error"
    :fab="[newAction]"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <!-- props 是每列多選要綁的那一包 -->
    <template #default="{ row, props: itemProps }">
      <DataCard v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
