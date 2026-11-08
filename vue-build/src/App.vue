<script lang="ts" setup>
  import { useRoute } from 'vue-router'
  import AppShell from '@/components/ui/shell/AppShell.vue'
  import { drawerSections, navItems } from '@/config/navigation'

  const route = useRoute()
</script>

<template>
  <v-app>
    <AppShell :drawer-sections="drawerSections" :nav-items="navItems">
      <!-- 換頁動畫由 router 以 View Transitions 處理（見 docs/topics/pages.md 的「換頁動畫」） -->
      <router-view v-slot="{ Component }">
        <keep-alive :max="50">
          <component :is="Component" :key="route.fullPath" />
        </keep-alive>
      </router-view>
    </AppShell>
  </v-app>
</template>

<style>
/* 一律預留整頁捲軸的寬度，捲軸出現或消失時內容的寬度不變 */
:root {
  scrollbar-gutter: stable;
}

/* 換頁動畫：整個畫面的截圖依 <html> 的 data-dir 左右滑動 */
:root[data-transition='page']::view-transition-old(root),
:root[data-transition='page']::view-transition-new(root),
:root[data-transition='panel']::view-transition-old(dashboard-panel-active),
:root[data-transition='panel']::view-transition-new(dashboard-panel-active) {
  mix-blend-mode: normal;
  animation-duration: 0.3s;
  animation-timing-function: cubic-bezier(0.25, 0.8, 0.5, 1);
  animation-fill-mode: both;
}

:root[data-transition='page'][data-dir='forward']::view-transition-old(root) {
  animation-name: page-to-left;
}

:root[data-transition='page'][data-dir='forward']::view-transition-new(root) {
  animation-name: page-from-right;
}

:root[data-transition='page'][data-dir='back']::view-transition-old(root) {
  animation-name: page-to-right;
}

:root[data-transition='page'][data-dir='back']::view-transition-new(root) {
  animation-name: page-from-left;
}

/* dashboard 面板內：選取改變時各面板淡入淡出。展開的面板切換列時命名為 dashboard-panel-active，左右滑動 */
:root[data-transition='panel'][data-dir='forward']::view-transition-old(dashboard-panel-active) {
  animation-name: page-to-left;
}

:root[data-transition='panel'][data-dir='forward']::view-transition-new(dashboard-panel-active) {
  animation-name: page-from-right;
}

:root[data-transition='panel'][data-dir='back']::view-transition-old(dashboard-panel-active) {
  animation-name: page-to-right;
}

:root[data-transition='panel'][data-dir='back']::view-transition-new(dashboard-panel-active) {
  animation-name: page-from-left;
}

::view-transition-group(dashboard-panel-active) {
  overflow: clip;
}

@keyframes page-to-left {
  to {
    transform: translateX(-100%);
  }
}

@keyframes page-from-right {
  from {
    transform: translateX(100%);
  }
}

@keyframes page-to-right {
  to {
    transform: translateX(100%);
  }
}

@keyframes page-from-left {
  from {
    transform: translateX(-100%);
  }
}

/* 表單層開啟或關閉時，整個畫面一起滑動 */
:root[data-layer-nav] * {
  view-transition-name: none !important;
}

/* 外殼（App Bar、抽屜、底部列、FAB、上一列與下一列的按鈕）各自命名，不在畫面截圖中，直接換成新的內容 */
::view-transition-group(app-bar),
::view-transition-group(nav-drawer),
::view-transition-group(bottom-bar),
::view-transition-group(page-fab),
::view-transition-group(record-prev),
::view-transition-group(record-next),
::view-transition-new(app-bar),
::view-transition-new(nav-drawer),
::view-transition-new(bottom-bar),
::view-transition-new(page-fab),
::view-transition-new(record-prev),
::view-transition-new(record-next) {
  animation: none;
}

::view-transition-old(app-bar),
::view-transition-old(nav-drawer),
::view-transition-old(bottom-bar),
::view-transition-old(page-fab),
::view-transition-old(record-prev),
::view-transition-old(record-next) {
  display: none;
}
</style>
