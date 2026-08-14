<script lang="ts" setup>
  import AppShell from '@/components/ui/AppShell.vue'
  import { navItems } from '@/config/navigation'
</script>

<template>
  <v-app>
    <AppShell :nav-items="navItems">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </AppShell>
  </v-app>
</template>
