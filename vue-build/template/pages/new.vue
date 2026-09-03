<!-- 複製到 src/pages/__table__/new.vue -->
<route lang="json5">
{ meta: { title: '新增範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import DataForm from '@/components/ui/DataForm.vue'
  import { __table__Schema } from '@/schema/__table__'
  import { columnValues } from '@/schema/types'
  import { mutateTable } from '@/services/appScript'

  const router = useRouter()

  const form = ref<__Table__Row>({
    id: '',
    name: null,
    amount: null,
    date: null,
  })

  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function handleSubmit () {
    submitting.value = true
    error.value = null

    try {
      await mutateTable('create', '__table__', columnValues(form.value, __table__Schema))
      await router.push('/__table__')
    } catch (submitError) {
      error.value = submitError instanceof Error ? submitError.message : String(submitError)
    } finally {
      submitting.value = false
    }
  }
</script>

<template>
  <div>
    <DataForm v-model="form" :schema="__table__Schema" />

    <v-container>
      <v-alert v-if="error" class="mb-4" :text="error" type="error" />

      <v-btn block :loading="submitting" @click="handleSubmit">新增</v-btn>
    </v-container>
  </div>
</template>
