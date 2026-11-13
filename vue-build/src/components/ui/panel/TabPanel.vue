<script lang="ts" setup>
  import { provide, toRef } from 'vue'
  import { dashboardPanelKey, useDashboardPanel } from '@/composables/shell/useDashboardLinks'
  import { panelActiveKey, panelVisibleKey, usePanelActive, usePanelVisible } from '@/composables/shell/usePanelActive'

  const props = defineProps<{
    active: boolean
    // 頁籤的名稱，用於取得面板為此頁籤設定的接線
    tab: string
  }>()

  // TabPage 內部使用：每個頁籤各有一份 provide。外層的面板（例如儀表板的面板）也須作用中
  const outer = usePanelActive()
  provide(panelActiveKey, toRef(() => props.active && outer.value))
  const outerVisible = usePanelVisible()
  provide(panelVisibleKey, toRef(() => props.active && outerVisible.value))

  // 面板的 tabs 中有此頁籤時，頁籤的內容改用頁籤自己的接線（見 docs/components/panel/DashboardPanel.md）
  const own = useDashboardPanel()?.forTab(props.tab)
  if (own) {
    provide(dashboardPanelKey, own)
  }
</script>

<template>
  <slot />
</template>
