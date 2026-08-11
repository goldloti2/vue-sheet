<template>
  <v-app>
    <AppShell :nav-items="navItems">
      <router-view />
    </AppShell>
  </v-app>
</template>

<script lang="ts" setup>
  import AppShell from '@/components/ui/AppShell.vue'
  import { navItems } from '@/config/navigation'
</script>
