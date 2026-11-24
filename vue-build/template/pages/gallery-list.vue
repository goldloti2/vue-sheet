<!-- 選用：以 gallery 呈現的列表頁，同樣複製到 src/pages/__table__/index.vue
     格子的版面與動作的呈現見 docs/components/list/DataGallery.md。
     外觀與用途見 docs/design/list.md，搜尋、篩選與排序見 docs/topics/search.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { useActions } from '@/composables/actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { defineView } from '@/schema/view'

  // 整表 → 篩選 → 搜尋（搜尋、篩選與排序按鈕自動登記至 App Bar），以及長按多選
  // 順序與 schema 的 defaultSort 不同時，以選項 { defaultSort: [...] } 指定，排在 schema 的 defaultSort 之前
  const { rows, loading, error, selection, match } = useListPage('__table__')

  // 不須多選時，不將 selection 交給 ListPage
  const { new: newAction, bulkDelete, edit, delete: remove } = useActions('__table__', { list: { selection, match } })

  // gallery 只使用 image、title 與 subtitle，actions 收於右下角的 ⋮ 選單（見 docs/components/list/DataGallery.md）
  const view = defineView('__table__', {
    title: 'name',
    subtitle: 'date',
    actions: row => [edit(row), remove(row)],
  })
</script>

<template>
  <!-- item 為 gallery 時各格格狀排列，手機上為兩欄 -->
  <ListPage
    :app-bar="[bulkDelete]"
    :error="error"
    :fab="[newAction]"
    item="gallery"
    :loading="loading"
    :row-to="row => `/__table__/${row.id}`"
    :rows="rows"
    :selection="selection"
    table="__table__"
    :view="view"
  />
</template>
