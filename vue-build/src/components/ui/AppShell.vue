<script lang="ts" setup>
  import { shallowRef } from 'vue'
  import { useRoute } from 'vue-router'

  export interface AppNavItem {
    title: string
    icon: string
    to: string
  }

  interface AppShellProps {
    title?: string
    navItems?: AppNavItem[]
  }

  withDefaults(defineProps<AppShellProps>(), {
    title: 'AAAA',
    navItems: () => [],
  })

  const drawer = shallowRef(true)
  const route = useRoute()
</script>

<template>
  <v-app-bar>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>{{ title }}</v-app-bar-title>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" />

  <v-main>
    <slot />
  </v-main>

  <v-bottom-navigation :model-value="route.path">
    <v-btn
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :value="item.to"
    >
      <v-icon :icon="item.icon" />
      <span>{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>
