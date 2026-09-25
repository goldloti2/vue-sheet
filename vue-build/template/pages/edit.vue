<!-- 複製到 src/pages/__table__/[id]/edit.vue -->
<route lang="json5">
{ meta: { title: '編輯範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import FormPage from '@/components/ui/page/FormPage.vue'
  import { useEditForm } from '@/composables/form/useTableForm'
  import { useRouteId } from '@/composables/navigation/useRouteId'
  import { __table__Schema } from '@/schema/__table__'

  // 載入中／載入失敗／找不到資料三種狀態由 FormPage 自己顯示
  const { form, fieldErrors, loading, loadError, error }
    = useEditForm<__Table__Row>('__table__', __table__Schema, useRouteId())
</script>

<template>
  <FormPage
    v-model="form"
    :error="error"
    :errors="fieldErrors"
    :load-error="loadError"
    :loading="loading"
    :schema="__table__Schema"
  />
</template>
