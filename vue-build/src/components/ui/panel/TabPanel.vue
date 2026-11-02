<script lang="ts" setup>
  import { provide, toRef } from 'vue'
  import { panelActiveKey, usePanelActive } from '@/composables/shell/usePanelActive'

  const props = defineProps<{
    active: boolean
  }>()

  // TabPage 內部使用：每個頁籤各有一份 provide。外層的面板（例如儀表板的面板）也須作用中
  const outer = usePanelActive()
  provide(panelActiveKey, toRef(() => props.active && outer.value))
</script>

<template>
  <slot />
</template>
