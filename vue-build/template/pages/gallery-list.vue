<!-- 選用：以 gallery 呈現的列表頁，同樣複製到 src/pages/__table__/index.vue
     格子的版面與動作的呈現見 docs/components/list/DataGallery.md；
     外觀與用途見 docs/design/list.md，搜尋、篩選與排序見 docs/topics/search.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import DataGallery from '@/components/ui/list/DataGallery.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  // 整表 → 篩選 → 搜尋（放大鏡、篩選與排序鈕自動登記到 App Bar）+ 長按多選
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema)

  // 不要多選就不傳 selectedIds / onDone，也不用把 selection 交給 ListPage
  const { new: newAction, bulkDelete, edit, delete: remove } = use__Table__Actions({
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => [bulkDelete.value])

  // gallery 僅使用 image（上方的正方形圖片，有圖片欄位時指定；沒有時以灰色方塊佔位）、
  // title 與 subtitle；actions 收於右下角的 ⋮ 選單
  const view = defineView(__table__Schema, {
    title: 'name',
    subtitle: 'date',
    actions: row => [edit(row), remove(row)],
  })
</script>

<template>
  <!-- layout="grid" 使各格格狀排列，手機上為兩欄 -->
  <ListPage
    :error="error"
    :fab="[newAction]"
    layout="grid"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <!-- props 是每列多選要綁的那一包 -->
    <template #default="{ row, props: itemProps }">
      <DataGallery v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
