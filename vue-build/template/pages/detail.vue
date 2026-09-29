<!-- 複製到 src/pages/__table__/[id]/index.vue
     版型（上下筆、FAB、slot 放子表格）見 docs/components/DetailPage.md；
     欄位怎麼顯示、欄位動作見 docs/components/DataDetail.md -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DetailPage from '@/components/ui/page/DetailPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/__table__'

  // 網址上的 id + 那一筆；載入狀態與左右滑動換筆都由 DetailPage 處理
  const { id, row, loading, error } = useRecordPage<__Table__Row>('__table__')

  const { delete: deleteActions, edit: editActions, fieldActions } = use__Table__Actions({ row })
  useAppBarActions(() => deleteActions.value)
</script>

<template>
  <!-- 這張表額外要顯示的東西（子表格、說明…）放進 default slot，scope 給的 row 已經不是 null -->
  <DetailPage
    :id="id"
    :error="error"
    :fab="editActions"
    :field-actions="fieldActions"
    :loading="loading"
    :row="row"
    :schema="__table__Schema"
    table="__table__"
  />
</template>
