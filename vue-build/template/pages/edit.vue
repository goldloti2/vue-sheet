<route lang="json5">
{ meta: { title: 'edit' } }
</route>

<script lang="ts" setup>
  import type { TemplateRow } from '@/schema/template'
  import { ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DataForm from '@/components/ui/DataForm.vue'
  import { useTableRow } from '@/composables/useTableRow'
  import { templateSchema } from '@/schema/template'
  import { columnValues } from '@/schema/types'
  import { mutateTable } from '@/services/appScript'

  const route = useRoute('/template/[id]/edit')
  const router = useRouter()

  const { row, loading, error: loadError } = useTableRow<TemplateRow>('template', String(route.params.id))

  const form = ref<TemplateRow | null>(null)

  watch(row, newRow => {
    if (newRow) {
      form.value = { ...newRow } as TemplateRow
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
      await mutateTable('update', 'template', { id: form.value.id, ...columnValues(form.value, templateSchema) })
      await router.push(`/template/${form.value.id}`)
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
      <DataForm v-model="form" :schema="templateSchema" />

      <v-container>
        <v-alert v-if="submitError" class="mb-4" :text="submitError" type="error" />

        <v-btn block :loading="submitting" @click="handleSubmit">儲存</v-btn>
      </v-container>
    </template>
  </div>
</template>
