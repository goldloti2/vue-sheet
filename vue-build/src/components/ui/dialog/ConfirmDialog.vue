<script lang="ts" setup>
  import type { DialogChoice } from '@/composables/shell/useDialogs'
  import AppDialog from '@/components/ui/dialog/AppDialog.vue'

  interface ConfirmDialogProps {
    title: string
    text: string
    // 右邊那幾顆鈕，通常只有一顆「確定」（見 useDialogs 的 confirm／choose）
    choices: DialogChoice[]
    loading?: boolean
    error?: string | null
  }

  defineProps<ConfirmDialogProps>()

  const open = defineModel<boolean>({ required: true })

  const emit = defineEmits<{
    choose: [key: string]
  }>()
</script>

<template>
  <AppDialog v-model="open" :title="title">
    {{ text }}

    <v-alert v-if="error" class="mt-2" :text="error" type="error" />

    <template #actions>
      <v-spacer />
      <v-btn @click="open = false">取消</v-btn>

      <v-btn
        v-for="choice in choices"
        :key="choice.key"
        :color="choice.color"
        :loading="loading"
        :text="choice.label"
        @click="emit('choose', choice.key)"
      />
    </template>
  </AppDialog>
</template>
