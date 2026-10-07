<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { AppBarTabs } from '@/composables/shell/useAppBarTabs'
  import type { ListControls } from '@/composables/shell/useListControls'
  import { mdiArrowLeft, mdiClose, mdiDotsVertical, mdiFilterVariant, mdiLogout, mdiMagnify, mdiRefresh, mdiSort } from '@mdi/js'
  import { computed, onBeforeUnmount, onMounted, provide, shallowRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfirmDialog from '@/components/ui/dialog/ConfirmDialog.vue'
  import FieldsDialog from '@/components/ui/dialog/FieldsDialog.vue'
  import FilterPanel from '@/components/ui/shell/FilterPanel.vue'
  import SortPanel from '@/components/ui/shell/SortPanel.vue'
  import { provideActionRunner } from '@/composables/shell/useActionRunner'
  import { appBarTabsKey, currentTabKey } from '@/composables/shell/useAppBarTabs'
  import { confirmFields, fieldsDialog } from '@/composables/shell/useAskFields'
  import { choose, confirm, confirmDialog, notice, notify, pickChoice } from '@/composables/shell/useDialogs'
  import { listControlsKey } from '@/composables/shell/useListControls'
  import { overlayOpenKey } from '@/composables/shell/useOverlay'
  import { appBarActionsKey, appBarSelectionKey, bottomActionsKey } from '@/composables/shell/useShellActions'
  import { appName, authMethod } from '@/config/app'
  import { navigationCount } from '@/router'
  import { hasActiveFilter } from '@/schema/filter'
  import { clearToken } from '@/services/auth/token'
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

  const title = computed(() => route.meta.title ?? appName)

  // 登入頁這類整頁自己排版的頁面：App Bar、側邊欄、底部導覽列都不顯示
  const showShell = computed(() => route.meta.shell !== false)

  const appBarActions = shallowRef<PageAction[]>([])
  provide(appBarActionsKey, actions => {
    appBarActions.value = actions
  })

  // 註冊了底部動作就暫時取代導覽列（表單頁用），離開頁面自動還原
  const bottomActions = shallowRef<PageAction[]>([])
  provide(bottomActionsKey, actions => {
    bottomActions.value = actions
  })

  // 多選模式的出口。不是 null 就代表頁面正在多選，搜尋那些鈕先讓位（見 template）
  const cancelSelect = shallowRef<(() => void) | null>(null)
  provide(appBarSelectionKey, cancel => {
    cancelSelect.value = cancel
  })

  // 頁籤列（TabView 登記的）掛在 App Bar 底下，所以不會跟著內容捲走
  const tabs = shallowRef<AppBarTabs | null>(null)
  provide(appBarTabsKey, value => {
    tabs.value = value
  })

  // 頁面與面板都在底下，靠這個知道使用者換頁籤了（例如多選要跟著取消）
  provide(currentTabKey, computed(() => tabs.value?.current.value ?? null))

  // 頁面登記了搜尋才有放大鏡；按下去 App Bar 換成輸入框。query 是頁面的 ref，關掉時清空
  const controls = shallowRef<ListControls | null>(null)
  provide(listControlsKey, value => {
    controls.value = value
  })
  const searchOpen = shallowRef(false)

  // 一頁可以有好幾張表的條件（頁籤各接一張），任一張有條件就算篩選中
  const drawerTables = computed(() => controls.value?.drawer?.tables ?? [])
  const filterActive = computed(() => drawerTables.value.some(table => hasActiveFilter(table.filters.value)))

  // 有給 sort 的表才有排序鈕；任一張不是預設排序就算排序中
  const sortTables = computed(() => drawerTables.value.filter(table => table.sort))
  const sortActive = computed(() => sortTables.value.some(table => table.sort?.value))

  // 換頁就收起來；回到還帶著 query 或篩選的頁面（KeepAlive）就重新打開，讓列表跟搜尋欄一致
  // 抽屜也一起收：使用者可以在抽屜開著時按返回鍵換頁
  watch(controls, value => {
    searchOpen.value = value !== null && (value.query.value !== '' || filterActive.value)
    drawerMode.value = null
  })

  // 右側抽屜一次只放一種面板：篩選鈕在搜尋欄裡、排序鈕在 App Bar 上，兩顆各開各的
  // 抽屜蓋住 App Bar，所以要換面板一定得先關掉，不用另外擋
  const drawerMode = shallowRef<'filter' | 'sort' | null>(null)

  // 關起來的那段時間抽屜還在滑出去，內容不能跟著消失或換掉，不然會看到另一個面板閃一下
  const shownPanel = shallowRef<'filter' | 'sort'>('filter')
  watch(drawerMode, mode => {
    if (mode) {
      shownPanel.value = mode
    }
  })

  const drawerOpen = computed({
    get: () => drawerMode.value !== null,
    set: value => {
      if (!value) {
        drawerMode.value = null
      }
    },
  })

  // 抽屜開著時 FAB 讓開
  provide(overlayOpenKey, drawerOpen)

  // 關閉搜尋＝清掉 query 與所有表的篩選，列表回到全部
  function closeSearch () {
    if (controls.value) {
      controls.value.query.value = ''
    }
    for (const table of drawerTables.value) {
      table.filters.value = {}
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
      if (await store.refresh()) {
        return
      }

      // Sheet 被別處改過：整批都沒寫，佇列還在，問使用者要走哪條路（關掉就什麼都不做）
      if (!store.conflict) {
        notify(store.flushError ?? '推送失敗，稍後再試', 'error')
        return
      }

      const picked = await choose('Sheet已被別處修改', '要強制推送，還是重新抓取？', [
        { key: 'discard', label: '放棄並重抓' },
        { key: 'force', label: '強制推送', color: 'error' },
      ])

      if (picked === 'discard') {
        await store.discardAndReload()
      } else if (picked === 'force' && !await store.forcePush()) {
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

  // 清掉 token，router 就會帶去登入頁。未推送的變更留在佇列裡，重新登入後照常推送
  async function logout () {
    if (store.hasPending && !await confirm('登出', '有尚未推送的變更，確定要登出嗎？')) {
      return
    }
    clearToken()
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
  <v-app-bar v-if="showShell">
    <!-- 搜尋模式：整條 App Bar 換成返回鍵 + 輸入框，標題與動作先讓位 -->
    <template v-if="searchOpen && controls">
      <v-app-bar-nav-icon aria-label="關閉搜尋" :icon="mdiArrowLeft" @click="closeSearch" />

      <!-- clearable 清空時給的是 null，收回成空字串 -->
      <v-text-field
        autofocus
        bg-color="grey-lighten-3"
        class="mr-4"
        clearable
        density="compact"
        flat
        hide-details
        :model-value="controls.query.value"
        placeholder="搜尋"
        rounded="pill"
        variant="solo"
        @update:model-value="(value) => controls && (controls.query.value = value ?? '')"
      >
        <template v-if="drawerTables.length > 0" #append-inner>
          <v-btn
            aria-label="篩選"
            :color="filterActive ? 'primary' : undefined"
            density="comfortable"
            :icon="mdiFilterVariant"
            variant="text"
            @click="drawerMode = 'filter'"
          />
        </template>
      </v-text-field>
    </template>

    <template v-else>
      <v-app-bar-nav-icon :icon="showBack ? mdiArrowLeft : undefined" @click="handleLeadingIconClick" />
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </template>

    <template v-if="!(searchOpen && controls)" #append>
      <!-- 多選模式讓位：那時畫面上要的是對選取項目的動作，搜尋這些先收起來 -->
      <v-btn v-if="controls && !cancelSelect" aria-label="搜尋" :icon="mdiMagnify" @click="searchOpen = true" />

      <v-btn
        v-if="sortTables.length > 0 && !cancelSelect"
        aria-label="排序"
        :color="sortActive ? 'primary' : undefined"
        :icon="mdiSort"
        @click="drawerMode = 'sort'"
      />

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

      <!-- 多選的出口釘在選單外面，收進去就找不到了 -->
      <v-btn v-if="cancelSelect" aria-label="取消" :icon="mdiClose" @click="cancelSelect()" />

      <v-btn
        aria-label="同步"
        :disabled="!store.canSync"
        icon
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

    <!-- 頁籤跟著 App Bar 固定在最上；搜尋模式下也留著，因為搜尋與篩選是跨頁籤的 -->
    <template v-if="tabs" #extension>
      <v-tabs v-model="tabs.current.value" align-tabs="center" grow>
        <v-tab v-for="tab in tabs.tabs" :key="tab" :value="tab">{{ tab }}</v-tab>
      </v-tabs>
    </template>
  </v-app-bar>

  <ConfirmDialog
    v-model="confirmDialog.open"
    :choices="confirmDialog.choices"
    :text="confirmDialog.text"
    :title="confirmDialog.title"
    @choose="pickChoice"
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

  <!-- 右側抽屜歸 AppShell，面板只放內容，一次顯示一種 -->
  <v-navigation-drawer
    v-if="drawerTables.length > 0"
    v-model="drawerOpen"
    location="end"
    order="-1"
    temporary
    width="320"
  >
    <FilterPanel
      v-if="shownPanel === 'filter'"
      :current="controls?.drawer?.current?.value"
      :open="drawerMode === 'filter'"
      :tables="drawerTables"
    />

    <SortPanel
      v-else
      :current="controls?.drawer?.current?.value"
      :open="drawerMode === 'sort'"
      :tables="sortTables"
    />
  </v-navigation-drawer>

  <v-snackbar v-model="notice.open" :color="notice.color">{{ notice.text }}</v-snackbar>

  <v-navigation-drawer v-if="showShell" v-model="drawer" order="-1">
    <v-list v-if="authMethod !== 'none'" nav>
      <v-list-item :prepend-icon="mdiLogout" title="登出" @click="logout" />
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <slot />
  </v-main>

  <v-bottom-navigation v-if="showShell && bottomActions.length > 0" grow>
    <v-btn
      v-for="action in bottomActions"
      :key="action.key"
      @click="runAction(action)"
    >
      {{ action.label }}
    </v-btn>
  </v-bottom-navigation>

  <v-bottom-navigation v-else-if="showShell" :model-value="route.path">
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
