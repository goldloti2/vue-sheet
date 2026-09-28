<!-- 複製到 src/pages/__parent__/[id]/__table__.vue（選用：詳細頁的子表區塊要「展開」才需要）
     → /__parent__/:id/__table__，一條父子關聯一份，同一個檔服務所有父列
     子表區塊怎麼擺見 docs/components/ChildList.md，版型見 ListPage.md -->
<route lang="json5">
{ meta: { title: '子表' } }
</route>

<script lang="ts" setup>
  import type { __Parent__Row } from '@/schema/__parent__'
  import DataList from '@/components/ui/list/DataList.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { __table__Schema } from '@/schema/__table__'
  import { formatField } from '@/schema/types'

  // 讀的是父表那一筆，子列走 store 掛好的 $子表_欄位key getter（照子表的 defaultSort 排）
  const { id, row, loading, error } = useRecordPage<__Parent__Row>('__parent__')

  // 從這裡新增的子列預設就掛在這個父列底下
  const { new: newActions } = use__Table__Actions({ defaults: () => ({ __parent__: id.value }) })
</script>

<template>
  <ListPage
    :error="error"
    :fab="newActions"
    :loading="loading"
    :rows="row?.$__table_____parent__ ?? []"
    table="__table__"
  >
    <template #default="{ row: child }">
      <DataList
        :bottom-left="formatField(child, __table__Schema, 'amount')"
        :title="formatField(child, __table__Schema, 'name')"
        :to="`/__table__/${child.id}`"
      />
    </template>
  </ListPage>
</template>
