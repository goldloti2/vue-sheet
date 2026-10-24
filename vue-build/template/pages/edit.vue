<!-- 複製到 src/pages/__table__/[id]/edit.vue
     版型見 docs/components/page/FormPage.md，欄位對應的輸入元件見 DataForm.md。
     離開時是否放棄改動由 useLeaveGuard 處理，見 docs/topics/pages.md -->
<route lang="json5">
{ meta: { title: '編輯範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import FormPage from '@/components/ui/page/FormPage.vue'
  import { useEditForm } from '@/composables/form/useTableForm'
  import { useRouteId } from '@/composables/navigation/useRouteId'
  import { __table__Schema } from '@/schema/tables/__table__'

  // 載入中、載入失敗與找不到列三種狀態由 FormPage 顯示
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
