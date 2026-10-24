<!-- 選用：複製到 src/pages/__parent__/[id]/__table__.vue，詳細頁的子表區塊須「展開」時才需要
     → /__parent__/:id/__table__。每條父子關聯一份，同一個檔案用於所有父列
     子表區塊的擺放見 docs/components/page/ChildList.md，版型見 ListPage.md -->
<route lang="json5">
{ meta: { title: '子表' } }
</route>

<script lang="ts" setup>
  import type { __Parent__Row } from '@/schema/tables/__parent__'
  import DataList from '@/components/ui/list/DataList.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  // 讀取父列，子列取自 store 掛上的 $子表_欄位key getter（依子表的 defaultSort 排序）
  const { id, row, loading, error } = useRecordPage<__Parent__Row>('__parent__')

  const view = defineView(__table__Schema, { title: 'name', summary: 'amount' })

  // 於此新增的子列預設屬於此父列
  const { new: newAction } = use__Table__Actions({ defaults: () => ({ __parent__: id.value }) })
</script>

<template>
  <ListPage
    :error="error"
    :fab="[newAction]"
    :loading="loading"
    :rows="row?.$__table_____parent__ ?? []"
    table="__table__"
  >
    <template #default="{ row: child }">
      <DataList :row="child" :to="`/__table__/${child.id}`" :view="view" />
    </template>
  </ListPage>
</template>
