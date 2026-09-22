<!-- 複製到 src/pages/__table__/[id]/index.vue -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import { Touch as vTouch } from 'vuetify/directives'
  import DataDetail from '@/components/ui/record/DataDetail.vue'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useTableRow } from '@/composables/data/useTableRow'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'
  import { useRouteId } from '@/composables/navigation/useRouteId'
  import { useAppBarActions } from '@/composables/shell/useAppBarActions'
  import { __table__Schema } from '@/schema/__table__'

  const id = useRouteId()
  const { swipe } = useSiblingNav('__table__', id)
  const { row, loading, error } = useTableRow<__Table__Row>('__table__', id)

  const { delete: deleteActions, edit: editActions, fieldActions } = use__Table__Actions({ row })
  useAppBarActions(() => deleteActions.value)
</script>

<template>
  <div v-touch="swipe">
    <DataDetail
      :error="error"
      :field-actions="fieldActions"
      :loading="loading"
      :row="row"
      :schema="__table__Schema"
    />

    <RecordNav :id="id" table="__table__" />

    <PageFab :actions="editActions" />
  </div>
</template>
