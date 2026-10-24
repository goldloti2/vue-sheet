<script lang="ts" setup>
  import { provide, toRef } from 'vue'
  import { panelActiveKey } from '@/composables/shell/usePanelActive'

  const props = defineProps<{
    active: boolean
  }>()

  // TabPage 內部使用：每個頁籤各有一份 provide，面板中的頁面據此判斷是否為目前的頁籤
  provide(panelActiveKey, toRef(() => props.active))
</script>

<template>
  <slot />
</template>
