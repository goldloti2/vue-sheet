<!-- 複製到 src/pages/__table__/[id]/index.vue -->
<route lang="json5">
{ meta: { title: '範本詳細' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import { Touch as vTouch } from 'vuetify/directives'
  import DataDetail from '@/components/ui/DataDetail.vue'
  import PageFab from '@/components/ui/PageFab.vue'
  import RecordNav from '@/components/ui/RecordNav.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useAppBarActions } from '@/composables/useAppBarActions'
  import { useSiblingNav } from '@/composables/useListOrder'
  import { useRouteId } from '@/composables/useRouteId'
  import { useTableRow } from '@/composables/useTableRow'

  const id = useRouteId()
  const { swipe } = useSiblingNav('__table__', id)
  const { row, loading, error } = useTableRow<__Table__Row>('__table__', id)

  const { delete: deleteActions, edit: editActions } = use__Table__Actions({ row })
  useAppBarActions(() => deleteActions.value)
</script>

<template>
  <div v-touch="swipe">
    <DataDetail
      :error="error"
      :loading="loading"
      :row="row"
      table="__table__"
    />

    <RecordNav :id="id" table="__table__" />

    <PageFab :actions="editActions" />
  </div>
</template>
