<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { AppBarSearch } from '@/composables/useAppBarSearch'
  import { mdiArrowLeft, mdiDotsVertical, mdiFilterVariant, mdiMagnify, mdiRefresh } from '@mdi/js'
  import { computed, onBeforeUnmount, onMounted, provide, shallowRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import FieldsDialog from '@/components/ui/FieldsDialog.vue'
  import { provideActionRunner } from '@/composables/useActionRunner'
  import { appBarActionsKey } from '@/composables/useAppBarActions'
  import { appBarSearchKey } from '@/composables/useAppBarSearch'
  import { confirmFields, fieldsDialog } from '@/composables/useAskFields'
  import { bottomActionsKey } from '@/composables/useBottomActions'
  import { acceptConfirm, confirmDialog } from '@/composables/useConfirm'
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

  // 註冊了底部動作就暫時取代導覽列（表單頁用），離開頁面自動還原
  const bottomActions = shallowRef<PageAction[]>([])
  provide(bottomActionsKey, actions => {
    bottomActions.value = actions
  })

  // 頁面登記了搜尋才有放大鏡；按下去 App Bar 換成輸入框。query 是頁面的 ref，關掉時清空
  const search = shallowRef<AppBarSearch | null>(null)
  provide(appBarSearchKey, value => {
    search.value = value
  })
  const searchOpen = shallowRef(false)

  // 換頁就收起來；回到還帶著 query 的頁面（KeepAlive）就重新打開，讓列表跟搜尋欄一致
  watch(search, value => {
    searchOpen.value = value !== null && value.query.value !== ''
  })

  function closeSearch () {
    if (search.value) {
      search.value.query.value = ''
    }
    searchOpen.value = false
  }

  // 動作的執行與確認框都在這裡，頁面只負責註冊動作
  const runAction = provideActionRunner()

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
    <!-- 搜尋模式：整條 App Bar 換成返回鍵 + 輸入框，標題與動作先讓位 -->
    <template v-if="searchOpen && search">
      <v-app-bar-nav-icon aria-label="關閉搜尋" :icon="mdiArrowLeft" @click="closeSearch" />

      <!-- clearable 清空時給的是 null，收回成空字串 -->
      <v-text-field
        :append-inner-icon="search.onFilter ? mdiFilterVariant : undefined"
        autofocus
        bg-color="grey-lighten-3"
        class="mr-4"
        clearable
        density="compact"
        flat
        hide-details
        :model-value="search.query.value"
        placeholder="搜尋"
        rounded="pill"
        variant="solo"
        @click:append-inner="search.onFilter"
        @update:model-value="(value) => search && (search.query.value = value ?? '')"
      />
    </template>

    <template v-else>
      <v-app-bar-nav-icon :icon="showBack ? mdiArrowLeft : undefined" @click="handleLeadingIconClick" />
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </template>

    <template v-if="!(searchOpen && search)" #append>
      <v-btn v-if="search" aria-label="搜尋" :icon="mdiMagnify" @click="searchOpen = true" />

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
        :disabled="!store.canSync"
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
    v-model="confirmDialog.open"
    :text="confirmDialog.text"
    :title="confirmDialog.title"
    @confirm="acceptConfirm"
  />

  <FieldsDialog
    v-if="fieldsDialog.schema"
    v-model="fieldsDialog.open"
    v-model:form="fieldsDialog.form"
    :errors="fieldsDialog.errors"
    :keys="fieldsDialog.keys"
    :schema="fieldsDialog.schema"
    :title="fieldsDialog.title"
    @confirm="confirmFields"
  />

  <v-snackbar v-model="notice.open" :color="notice.color">{{ notice.text }}</v-snackbar>

  <v-navigation-drawer v-model="drawer" />

  <v-main>
    <slot />
  </v-main>

  <v-bottom-navigation v-if="bottomActions.length > 0" grow>
    <v-btn
      v-for="action in bottomActions"
      :key="action.key"
      @click="runAction(action)"
    >
      {{ action.label }}
    </v-btn>
  </v-bottom-navigation>

  <v-bottom-navigation v-else :model-value="route.path">
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
