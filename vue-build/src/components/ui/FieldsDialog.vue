<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import AppDialog from '@/components/ui/AppDialog.vue'
  import DataForm from '@/components/ui/DataForm.vue'

  interface FieldsDialogProps {
    title: string
    schema: TableSchema
    keys: readonly string[]
    errors?: Record<string, string>
  }

  defineProps<FieldsDialogProps>()

  const open = defineModel<boolean>({ required: true })
  const form = defineModel<object>('form', { required: true })

  const emit = defineEmits<{
    confirm: []
  }>()
</script>

<template>
  <AppDialog v-model="open" :title="title">
    <DataForm v-model="form" :errors="errors" :only="keys" :schema="schema" />

    <template #actions>
      <v-spacer />
      <v-btn @click="open = false">取消</v-btn>
      <v-btn color="primary" @click="emit('confirm')">確定</v-btn>
    </template>
  </AppDialog>
</template>
