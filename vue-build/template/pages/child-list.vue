<!-- 選用：子表的展開頁，複製到 src/pages/__parent__/[id]/__table__.vue（檔名可自訂）→ /__parent__/:id/__table__
     同時供父表的詳細頁導入為子表區塊，同一個檔案用於所有父列。每條父子關聯一份
     子表區塊的擺放見 docs/components/page/ChildList.md，版型見 ListPage.md -->
<route lang="json5">
{ meta: { title: '子表' } }
</route>

<script lang="ts" setup>
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { useActions } from '@/composables/actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { defineView } from '@/schema/view'

  // 讀取父列，子列取自 store 掛上的 $子表_欄位key getter（依子表的 defaultSort 排序）
  const { id, row, loading, error } = useRecordPage('__parent__')

  const view = defineView('__table__', { title: 'name', summary: 'amount' })

  // 於此新增的子列預設屬於此父列。子表區塊中為「展開」旁的按鈕
  const { new: newAction } = useActions('__table__', { defaults: () => ({ __parent__: id.value }) })
</script>

<template>
  <ListPage
    :error="error"
    :fab="[newAction]"
    item="list"
    :loading="loading"
    :row-to="child => `/__table__/${child.id}`"
    :rows="row?.$__table_____parent__ ?? []"
    table="__table__"
    :view="view"
  />
</template>
