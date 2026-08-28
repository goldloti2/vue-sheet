<route lang="json5">
{ meta: { title: 'new' } }
</route>

<script lang="ts" setup>
  import type { TemplateRow } from '@/schema/template'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import DataForm from '@/components/ui/DataForm.vue'
  import { templateSchema } from '@/schema/template'
  import { columnValues } from '@/schema/types'
  import { mutateTable } from '@/services/appScript'

  const router = useRouter()

  const form = ref<TemplateRow>({
    id: '',
    status: null,
    number: null,
    date: null,
  })

  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function handleSubmit () {
    submitting.value = true
    error.value = null

    try {
      await mutateTable('create', 'template', columnValues(form.value, templateSchema))
      await router.push('/template')
    } catch (submitError) {
      error.value = submitError instanceof Error ? submitError.message : String(submitError)
    } finally {
      submitting.value = false
    }
  }
</script>

<template>
  <div>
    <DataForm v-model="form" :schema="templateSchema" />

    <v-container>
      <v-alert v-if="error" class="mb-4" :text="error" type="error" />

      <v-btn block :loading="submitting" @click="handleSubmit">新增</v-btn>
    </v-container>
  </div>
</template>
