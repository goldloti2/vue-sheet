<script lang="ts" setup>
  import { provide, toRef } from 'vue'
  import { panelActiveKey } from '@/composables/shell/usePanelActive'

  const props = defineProps<{
    active: boolean
  }>()

  // TabView 內部用：只為了讓每個頁籤各有一份 provide，面板裡的頁面才知道自己是不是當前那個
  provide(panelActiveKey, toRef(() => props.active))
</script>

<template>
  <slot />
</template>
