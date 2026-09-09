<!-- 複製到 src/pages/__table__/[id]/edit.vue -->
<route lang="json5">
{ meta: { title: '編輯範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataForm from '@/components/ui/DataForm.vue'
  import { useRouteId } from '@/composables/useRouteId'
  import { useEditForm } from '@/composables/useTableForm'
  import { __table__Schema } from '@/schema/__table__'

  const id = useRouteId()

  const { form, fieldErrors, loading, loadError, submitting, error, submit }
    = useEditForm<__Table__Row>('__table__', __table__Schema, id)
</script>

<template>
  <div>
    <v-container v-if="loading">
      <v-progress-circular indeterminate />
    </v-container>

    <v-container v-else-if="loadError">
      <v-alert :text="loadError" type="error" />
    </v-container>

    <v-container v-else-if="!form">
      <v-alert text="找不到這筆資料" type="warning" />
    </v-container>

    <template v-else>
      <DataForm v-model="form" :errors="fieldErrors" :schema="__table__Schema" />

      <v-container>
        <v-alert v-if="error" class="mb-4" :text="error" type="error" />

        <v-btn block :loading="submitting" @click="submit">儲存</v-btn>
      </v-container>
    </template>
  </div>
</template>
