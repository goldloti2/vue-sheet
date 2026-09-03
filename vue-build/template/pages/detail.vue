<!-- 複製到 src/pages/__table__/[id]/index.vue -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import DataDetail from '@/components/ui/DataDetail.vue'
  import PageFab from '@/components/ui/PageFab.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useAppBarActions } from '@/composables/useAppBarActions'
  import { useRouteId } from '@/composables/useRouteId'
  import { useTableRow } from '@/composables/useTableRow'
  import { __table__Schema } from '@/schema/__table__'

  const id = useRouteId()
  const { row, loading, error } = useTableRow<__Table__Row>('__table__', id)

  const { delete: deleteAction, edit: fabActions } = use__Table__Actions(row)
  useAppBarActions(() => deleteAction?.actions.value ?? [])
</script>

<template>
  <div>
    <DataDetail
      :error="error"
      :loading="loading"
      :row="row"
      :schema="__table__Schema"
    />

    <PageFab :actions="fabActions" />

    <ConfirmDialog
      v-if="deleteAction"
      v-model="deleteAction.dialog.open"
      :error="deleteAction.dialog.error"
      :loading="deleteAction.dialog.loading"
      text="確定要刪除嗎？"
      title="刪除確認"
      @confirm="deleteAction.confirm"
    />
  </div>
</template>
