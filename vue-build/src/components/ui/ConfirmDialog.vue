<script lang="ts" setup>
  import AppDialog from '@/components/ui/AppDialog.vue'

  interface ConfirmDialogProps {
    title: string
    text: string
    loading?: boolean
    error?: string | null
  }

  defineProps<ConfirmDialogProps>()

  const open = defineModel<boolean>({ required: true })

  const emit = defineEmits<{
    confirm: []
  }>()
</script>

<template>
  <AppDialog v-model="open" :title="title">
    {{ text }}

    <v-alert v-if="error" class="mt-2" :text="error" type="error" />

    <template #actions>
      <v-spacer />
      <v-btn @click="open = false">取消</v-btn>
      <v-btn color="error" :loading="loading" @click="emit('confirm')">確定</v-btn>
    </template>
  </AppDialog>
</template>
