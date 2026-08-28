<script lang="ts" setup>
  import { mdiArrowLeft } from '@mdi/js'
  import { computed, shallowRef } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { navigationCount } from '@/router'

  export interface AppNavItem {
    title: string
    icon: string
    to: string
  }

  interface AppShellProps {
    navItems?: AppNavItem[]
  }

  const props = withDefaults(defineProps<AppShellProps>(), {
    navItems: () => [],
  })

  const drawer = shallowRef(true)
  const route = useRoute()
  const router = useRouter()

  const title = computed(() => route.meta.title ?? 'AAAA')

  // 導覽列的目的地不用返回按鈕；其他方式進來的頁面（例如點列表項目進 detail）都算
  const showBack = computed(() => !props.navItems.some(item => item.to === route.path))

  function handleLeadingIconClick () {
    if (showBack.value) {
      if (navigationCount.value > 1) {
        router.back()
      }
    } else {
      drawer.value = !drawer.value
    }
  }
</script>

<template>
  <v-app-bar>
    <v-app-bar-nav-icon :icon="showBack ? mdiArrowLeft : undefined" @click="handleLeadingIconClick" />
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
