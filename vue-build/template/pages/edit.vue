<!-- 複製到 src/pages/__table__/[id]/edit.vue -->
<route lang="json5">
{ meta: { title: '編輯範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import { ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DataForm from '@/components/ui/DataForm.vue'
  import { useTableRow } from '@/composables/useTableRow'
  import { __table__Schema } from '@/schema/__table__'
  import { columnValues } from '@/schema/types'
  import { mutateTable } from '@/services/appScript'

  const route = useRoute('/__table__/[id]/edit')
  const router = useRouter()

  const { row, loading, error: loadError } = useTableRow<__Table__Row>('__table__', String(route.params.id))

  const form = ref<__Table__Row | null>(null)

  watch(row, newRow => {
    if (newRow) {
      form.value = { ...newRow } as __Table__Row
    }
  }, { immediate: true })

  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  async function handleSubmit () {
    if (!form.value) {
      return
    }

    submitting.value = true
    submitError.value = null

    try {
      await mutateTable('update', '__table__', { id: form.value.id, ...columnValues(form.value, __table__Schema) })
      await router.push(`/__table__/${form.value.id}`)
    } catch (error) {
      submitError.value = error instanceof Error ? error.message : String(error)
    } finally {
      submitting.value = false
    }
  }
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
      <DataForm v-model="form" :schema="__table__Schema" />

      <v-container>
        <v-alert v-if="submitError" class="mb-4" :text="submitError" type="error" />

        <v-btn block :loading="submitting" @click="handleSubmit">儲存</v-btn>
      </v-container>
    </template>
  </div>
</template>
