<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiArrowLeft, mdiDotsVertical } from '@mdi/js'
  import { computed, provide, shallowRef } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { appBarActionsKey } from '@/composables/useAppBarActions'
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

  const appBarActions = shallowRef<PageAction[]>([])
  provide(appBarActionsKey, actions => {
    appBarActions.value = actions
  })

  function handleActionClick (action: PageAction) {
    action.onClick?.()
  }

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

    <template #append>
      <template v-if="appBarActions.length <= 2">
        <v-btn
          v-for="action in appBarActions"
          :key="action.key"
          :aria-label="action.label"
          :icon="action.icon"
          :to="action.to"
          @click="handleActionClick(action)"
        />
      </template>

      <v-menu v-else>
        <template #activator="{ props: menuProps }">
          <v-btn aria-label="更多動作" :icon="mdiDotsVertical" v-bind="menuProps" />
        </template>

        <v-list>
          <v-list-item
            v-for="action in appBarActions"
            :key="action.key"
            :prepend-icon="action.icon"
            :title="action.label"
            :to="action.to"
            @click="handleActionClick(action)"
          />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" />

  <v-main>
    <slot />
  </v-main>

  <v-bottom-navigation :model-value="route.path">
    <v-btn
      v-for="item in navItems"
      :key="item.to"
      replace
      :to="item.to"
      :value="item.to"
    >
      <v-icon :icon="item.icon" />
      <span>{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>
