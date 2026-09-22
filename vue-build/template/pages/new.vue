<!-- 複製到 src/pages/__table__/new.vue -->
<route lang="json5">
{ meta: { title: '新增範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataForm from '@/components/ui/record/DataForm.vue'
  import { useCreateForm } from '@/composables/form/useTableForm'
  import { useBottomActions } from '@/composables/shell/useBottomActions'
  import { __table__Schema } from '@/schema/__table__'

  // 起始值依 schema 自動產生（全欄位 null），送出成功後回列表頁
  const { form, fieldErrors, error, actions } = useCreateForm<__Table__Row>('__table__', __table__Schema)
  useBottomActions(() => actions.value)
</script>

<template>
  <div>
    <DataForm v-model="form" :errors="fieldErrors" :schema="__table__Schema" />

    <v-container v-if="error">
      <v-alert :text="error" type="error" />
    </v-container>
  </div>
</template>
