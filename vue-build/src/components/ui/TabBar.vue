<script lang="ts" setup>
  defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })
</script>

<template>
  <v-tabs v-model="model" align-tabs="center" grow>
    <v-tab v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</v-tab>
  </v-tabs>
</template>
