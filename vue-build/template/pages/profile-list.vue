<!-- 選用：以 profile 呈現的列表頁，同樣複製到 src/pages/__table__/index.vue
     卡片的版面與動作的呈現見 docs/components/list/DataProfile.md。
     外觀與用途見 docs/design/list.md，搜尋、篩選與排序見 docs/topics/search.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import DataProfile from '@/components/ui/list/DataProfile.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { useActions } from '@/composables/actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { defineView } from '@/schema/view'

  // 整表 → 篩選 → 搜尋（搜尋、篩選與排序按鈕自動登記至 App Bar），以及長按多選
  const { rows, loading, error, selection, match } = useListPage('__table__')

  // 不須多選時，不將 selection 交給 ListPage
  const { new: newAction, bulkDelete, edit, delete: remove } = useActions('__table__', { list: { selection, match } })
  useAppBarActions(() => [bulkDelete.value])

  // profile 只使用 title、subtitle 與 image（頭像），actions 收於右側的 ⋮ 選單（見 docs/components/list/DataProfile.md）
  const view = defineView('__table__', {
    title: 'name',
    subtitle: 'date',
    actions: row => [edit(row), remove(row)],
  })
</script>

<template>
  <!-- 載入狀態、FAB 與列表順序（詳細頁的上一列、下一列）皆由 ListPage 處理 -->
  <ListPage
    :error="error"
    :fab="[newAction]"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <!-- props 為每列多選所需的屬性 -->
    <template #default="{ row, props: itemProps }">
      <DataProfile v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
