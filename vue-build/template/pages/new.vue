<!-- 複製到 src/pages/__table__/new.vue -->
<route lang="json5">
{ meta: { title: '新增範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataForm from '@/components/ui/DataForm.vue'
  import { useCreateForm } from '@/composables/useTableForm'
  import { __table__Schema } from '@/schema/__table__'

  // 起始值依 schema 自動產生（全欄位 null），送出成功後回列表頁
  const { form, fieldErrors, submitting, error, submit } = useCreateForm<__Table__Row>('__table__', __table__Schema)
</script>

<template>
  <div>
    <DataForm v-model="form" :errors="fieldErrors" :schema="__table__Schema" />

    <v-container>
      <v-alert v-if="error" class="mb-4" :text="error" type="error" />

      <v-btn block :loading="submitting" @click="submit">新增</v-btn>
    </v-container>
  </div>
</template>
