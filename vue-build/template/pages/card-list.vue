<!-- 選用：以 card 呈現的列表頁，同樣複製到 src/pages/__table__/index.vue
     卡片的四層與動作的呈現見 docs/components/list/DataCard.md。
     外觀與用途見 docs/design/list.md，搜尋、篩選與排序見 docs/topics/search.md -->
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

  // 整表 → 篩選 → 搜尋（搜尋、篩選與排序按鈕自動登記至 App Bar），以及長按多選
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema)

  // 不須多選時，不傳 selectedIds、onDone，也不將 selection 交給 ListPage
  const { new: newAction, bulkDelete, edit, delete: remove } = use__Table__Actions({
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => [bulkDelete.value])

  // header 為第 1 層，body 為第 2、3 層，actions 為第 4 層（見 docs/components/list/DataCard.md）
  const view = defineCardView(__table__Schema, {
    header: { title: 'name' },
    body: { subtitle: 'date', summary: 'amount' },
    actions: row => [{ ...edit(row), display: 'text' }, null, null, remove(row)],
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
      <DataCard v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
