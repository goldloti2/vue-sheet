<!-- 複製到 src/pages/__table__/index.vue
     版型見 docs/components/page/ListPage.md，各版面的位置見 docs/components/list/ 的 DataList.md、DataProfile.md 與 DataGallery.md。
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
  // 分組以選項 { levels: [...] } 指定，見 docs/components/page/ListPage.md
  const { rows, loading, error, selection, match } = useListPage('__table__')

  // 不須多選時，不將 selection 交給 ListPage。defaults 可傳 getter，依頁面狀態預填新增表單
  const { new: newAction, bulkDelete } = useActions('__table__', { list: { selection, match } })

  // 各版面使用的位置：list 為 title、subtitle、summary、aside 與 image，profile 與 gallery 為 title、subtitle 與 image
  // 每一列的動作以 actions 指定，另須自 useActions 取出 edit 與 delete: remove
  const view = defineView('__table__', {
    title: 'name',
    subtitle: 'date',
    summary: 'amount',
    // actions: row => [edit(row), remove(row)],
  })
</script>

<template>
  <!-- 載入狀態、FAB 與列表順序（詳細頁的上一列、下一列）皆由 ListPage 處理。
       item 為每一列的版面：list、profile 或 gallery。card 見 card-list.vue -->
  <ListPage
    :app-bar="[bulkDelete]"
    :error="error"
    :fab="[newAction]"
    item="list"
    :loading="loading"
    :row-to="row => `/__table__/${row.id}`"
    :rows="rows"
    :selection="selection"
    table="__table__"
    :view="view"
  />
</template>
