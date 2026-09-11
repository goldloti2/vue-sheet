<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiArrowLeft, mdiDotsVertical, mdiRefresh } from '@mdi/js'
  import { computed, onBeforeUnmount, onMounted, provide, shallowRef } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import { provideActionRunner } from '@/composables/useActionRunner'
  import { appBarActionsKey } from '@/composables/useAppBarActions'
  import { notice, notify } from '@/composables/useNotify'
  import { navigationCount } from '@/router'
  import { useTablesStore } from '@/stores/tables'

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

  // 動作的執行與確認框都在這裡，頁面只負責註冊動作
  const { dialog: actionDialog, confirm: confirmAction, run: runAction } = provideActionRunner()

  // 導覽列的目的地不用返回按鈕；其他方式進來的頁面（例如點列表項目進 detail）都算
  const showBack = computed(() => !props.navItems.some(item => item.to === route.path))

  const store = useTablesStore()
  const syncing = shallowRef(false)

  // 先推送再重抓。推不出去就不重抓，否則會蓋掉未推送的變更
  async function sync () {
    syncing.value = true
    try {
      if (!await store.refresh()) {
        notify(store.flushError ?? '推送失敗，稍後再試', 'error')
      }
    } finally {
      syncing.value = false
    }
  }

  // 離開前有未推送的變更時攔一下
  function warnUnsaved (event: BeforeUnloadEvent) {
    if (store.hasPending) {
      event.preventDefault()
    }
  }

  onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))

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
          @click="runAction(action)"
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
            @click="runAction(action)"
          />
        </v-list>
      </v-menu>

      <v-btn
        aria-label="同步"
        :loading="syncing"
        @click="sync"
      >
        <v-badge
          :color="store.flushError ? 'error' : 'warning'"
          dot
          location="bottom end"
          :model-value="store.hasPending"
        >
          <v-icon :icon="mdiRefresh" />
        </v-badge>
      </v-btn>
    </template>
  </v-app-bar>

  <ConfirmDialog
    v-model="actionDialog.open"
    :error="actionDialog.error"
    :loading="actionDialog.loading"
    :text="actionDialog.text"
    :title="actionDialog.title"
    @confirm="confirmAction"
  />

  <v-snackbar v-model="notice.open" :color="notice.color">{{ notice.text }}</v-snackbar>

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
