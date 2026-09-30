<!-- 複製到 src/pages/__table__/new.vue
     版型見 docs/components/FormPage.md；欄位怎麼變成輸入元件見 DataForm.md；
     初始值的三層來源見 docs/schema.md -->
<route lang="json5">
{ meta: { title: '新增範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import FormPage from '@/components/ui/page/FormPage.vue'
  import { useCreateForm } from '@/composables/form/useTableForm'
  import { __table__Schema } from '@/schema/tables/__table__'

  // 起始值依 schema 自動產生（全欄位 null），取消／送出自動掛上底部動作列，送出成功後回列表頁
  const { form, fieldErrors, error } = useCreateForm<__Table__Row>('__table__', __table__Schema)
</script>

<template>
  <FormPage v-model="form" :error="error" :errors="fieldErrors" :schema="__table__Schema" />
</template>
