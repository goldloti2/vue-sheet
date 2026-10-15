<script lang="ts" setup>
  import { useRoute } from 'vue-router'
  import AppShell from '@/components/ui/shell/AppShell.vue'
  import { navItems } from '@/config/navigation'

  const route = useRoute()
</script>

<template>
  <v-app>
    <AppShell :nav-items="navItems">
      <!-- 換頁動畫由 router 以 View Transitions 處理（見 docs/architecture.md 的設計取捨） -->
      <router-view v-slot="{ Component }">
        <keep-alive :max="50">
          <component :is="Component" :key="route.fullPath" />
        </keep-alive>
      </router-view>
    </AppShell>
  </v-app>
</template>

<style>
/* 換頁動畫：整個畫面的截圖依 <html> 的 data-dir 左右滑動 */
::view-transition-old(root),
::view-transition-new(root) {
  mix-blend-mode: normal;
  animation-duration: 0.3s;
  animation-timing-function: cubic-bezier(0.25, 0.8, 0.5, 1);
  animation-fill-mode: both;
}

:root[data-dir='forward']::view-transition-old(root) {
  animation-name: page-to-left;
}

:root[data-dir='forward']::view-transition-new(root) {
  animation-name: page-from-right;
}

:root[data-dir='back']::view-transition-old(root) {
  animation-name: page-to-right;
}

:root[data-dir='back']::view-transition-new(root) {
  animation-name: page-from-left;
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

/* 外殼（App Bar、抽屜、底部列、FAB、上下一筆）各自命名而不在整個畫面的截圖中，直接換成新的、不滑動 */
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
