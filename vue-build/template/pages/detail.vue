<script lang="ts" setup>
  import type { TemplateRow } from '@/schema/template'
  import { useRoute } from 'vue-router'
  import SchemaDetailFields from '@/components/ui/SchemaDetailFields.vue'
  import { useTableRow } from '@/composables/useTableRow'
  import { templateSchema } from '@/schema/template'

  const route = useRoute('/template/[id]/')
  const { row, loading, error } = useTableRow<TemplateRow>('template', String(route.params.id))
</script>

<template>
  <div>
    <SchemaDetailFields
      :error="error"
      :loading="loading"
      :row="row"
      :schema="templateSchema"
    />
  </div>
</template>
