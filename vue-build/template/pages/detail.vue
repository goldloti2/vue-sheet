<route lang="json5">
{ meta: { title: 'detail' } }
</route>

<script lang="ts" setup>
  import type { TemplateRow } from '@/schema/template'
  import { useRoute } from 'vue-router'
  import DataDetail from '@/components/ui/DataDetail.vue'
  import { useTableRow } from '@/composables/useTableRow'
  import { templateSchema } from '@/schema/template'

  const route = useRoute('/template/[id]/')
  const { row, loading, error } = useTableRow<TemplateRow>('template', String(route.params.id))
</script>

<template>
  <div>
    <DataDetail
      :error="error"
      :loading="loading"
      :row="row"
      :schema="templateSchema"
    />
  </div>
</template>
