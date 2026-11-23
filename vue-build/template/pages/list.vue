<!-- 複製到 src/pages/__table__/index.vue
     版型與每列的位置見 docs/components/page/ListPage.md 與 DataList.md。
     外觀與用途見 docs/design/list.md，搜尋、篩選與排序見 docs/topics/search.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { useActions } from '@/composables/actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { defineView } from '@/schema/view'

  // 整表 → 篩選 → 搜尋（搜尋、篩選與排序按鈕自動登記至 App Bar），以及長按多選
  // 順序與 schema 的 defaultSort 不同時，以選項 { defaultSort: [...] } 指定，排在 schema 的 defaultSort 之前
  // 分組以選項 { levels: [...] } 指定，見 docs/components/page/ListPage.md
  const { rows, loading, error, selection, match } = useListPage('__table__')

  // 每列四個角的欄位：title 左上、subtitle 右上、summary 左下、aside 右下
  const view = defineView('__table__', { title: 'name', subtitle: 'date', summary: 'amount' })

  // 不須多選時，不將 selection 交給 ListPage。defaults 可傳 getter，依頁面狀態預填新增表單
  const { new: newAction, bulkDelete } = useActions('__table__', { list: { selection, match } })
  useAppBarActions(() => [bulkDelete.value])
</script>

<template>
  <!-- 載入狀態、FAB 與列表順序（詳細頁的上一列、下一列）皆由 ListPage 處理 -->
  <ListPage
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
