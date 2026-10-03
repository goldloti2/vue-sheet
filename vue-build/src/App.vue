<script lang="ts" setup>
  import { useRoute } from 'vue-router'
  import AppShell from '@/components/ui/shell/AppShell.vue'
  import { navItems } from '@/config/navigation'
  import { transitionDir } from '@/router'

  const route = useRoute()
</script>

<template>
  <v-app>
    <AppShell :nav-items="navItems">
      <!-- 方向掛在這裡而不是 transition 的 name 上，理由見 docs/architecture.md 的設計取捨 -->
      <div class="page-transition-viewport" :data-dir="transitionDir">
        <router-view v-slot="{ Component }">
          <transition name="page">
            <keep-alive :max="50">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </AppShell>
  </v-app>
</template>

<style>
.page-transition-viewport {
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
}

.page-enter-active,
.page-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

/* 離場的那一頁疊在進場那頁上面，否則它會把進場的推到下面去 */
.page-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* 位移量由 viewport 的 data-dir 決定，取的是動畫那一帧的值 */
[data-dir='forward'] .page-enter-from {
  transform: translateX(100%);
}

[data-dir='forward'] .page-leave-to {
  transform: translateX(-100%);
}

[data-dir='back'] .page-enter-from {
  transform: translateX(-100%);
}

[data-dir='back'] .page-leave-to {
  transform: translateX(100%);
}
</style>
