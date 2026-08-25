<script lang="ts" setup>
  import AppShell from '@/components/ui/AppShell.vue'
  import { navItems } from '@/config/navigation'
  import { transitionDir } from '@/router'
</script>

<template>
  <v-app>
    <AppShell :nav-items="navItems">
      <div class="page-transition-viewport">
        <router-view v-slot="{ Component }">
          <transition :name="transitionDir">
            <keep-alive>
              <component :is="Component" />
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

.page-forward-enter-active,
.page-forward-leave-active,
.page-back-enter-active,
.page-back-leave-active {
  transition: transform 0.3s ease;
}

.page-forward-leave-active,
.page-back-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.page-forward-enter-from {
  transform: translateX(100%);
}

.page-forward-leave-to {
  transform: translateX(-100%);
}

.page-back-enter-from {
  transform: translateX(-100%);
}

.page-back-leave-to {
  transform: translateX(100%);
}
</style>
