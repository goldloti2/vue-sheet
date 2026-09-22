<!-- 複製到 src/pages/__table__/[id]/edit.vue -->
<route lang="json5">
{ meta: { title: '編輯範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataForm from '@/components/ui/record/DataForm.vue'
  import { useEditForm } from '@/composables/form/useTableForm'
  import { useRouteId } from '@/composables/navigation/useRouteId'
  import { useBottomActions } from '@/composables/shell/useBottomActions'
  import { __table__Schema } from '@/schema/__table__'

  const id = useRouteId()

  const { form, fieldErrors, loading, loadError, error, actions }
    = useEditForm<__Table__Row>('__table__', __table__Schema, id)
  useBottomActions(() => actions.value)
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

      <v-container v-if="error">
        <v-alert :text="error" type="error" />
      </v-container>
    </template>
  </div>
</template>
