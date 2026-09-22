<script lang="ts" setup>
  interface AppDialogProps {
    title?: string
    maxWidth?: string | number
  }

  withDefaults(defineProps<AppDialogProps>(), {
    maxWidth: 400,
  })

  const open = defineModel<boolean>({ required: true })
</script>

<template>
  <v-dialog v-model="open" :max-width="maxWidth">
    <v-card>
      <v-card-title v-if="title">{{ title }}</v-card-title>

      <v-card-text>
        <slot />
      </v-card-text>

      <v-card-actions v-if="$slots.actions">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
