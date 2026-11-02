<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { ListControls } from '@/composables/shell/useListControls'
  import type { AppBarHeading } from '@/composables/shell/useShellActions'
  import { mdiArrowLeft, mdiClose, mdiDotsVertical, mdiFilterVariant, mdiMagnify, mdiRefresh, mdiSort } from '@mdi/js'
  import { computed, onBeforeUnmount, onMounted, provide, shallowRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfirmDialog from '@/components/ui/dialog/ConfirmDialog.vue'
  import FieldsDialog from '@/components/ui/dialog/FieldsDialog.vue'
  import FilterPanel from '@/components/ui/shell/FilterPanel.vue'
  import NavDrawer from '@/components/ui/shell/NavDrawer.vue'
  import SortPanel from '@/components/ui/shell/SortPanel.vue'
  import { provideActionRunner } from '@/composables/shell/useActionRunner'
  import { confirmFields, fieldsDialog } from '@/composables/shell/useAskFields'
  import { choose, confirmDialog, notice, notify, pickChoice } from '@/composables/shell/useDialogs'
  import { listControlsKey } from '@/composables/shell/useListControls'
  import { overlayOpenKey } from '@/composables/shell/useOverlay'
  import { appBarActionsKey, appBarHeadingKey, appBarSelectionKey, bottomActionsKey } from '@/composables/shell/useShellActions'
  import { appName } from '@/config/app'
  import { navigationCount } from '@/router'
  import { hasActiveFilter } from '@/schema/filter'
  import { useTablesStore } from '@/stores/tables'

  export interface AppNavItem {
    title: string
    icon: string
    to: string
  }

  // 側邊欄的一組頁面。有 title 時可展開與收合，icon 顯示於組的標題前。沒有 title 時直接列出
  export interface AppNavSection {
    title?: string
    icon?: string
    items: AppNavItem[]
  }

  interface AppShellProps {
    // 底部導覽列，最多 BOTTOM_NAV_MAX 項
    navItems?: AppNavItem[]
    // 側邊欄的頁面，依組列出
    drawerSections?: AppNavSection[]
  }

  const props = withDefaults(defineProps<AppShellProps>(), {
    navItems: () => [],
    drawerSections: () => [],
  })

  // 底部導覽列的項目數上限，依 Material Design 的建議。超過的不顯示
  const BOTTOM_NAV_MAX = 5
  if (import.meta.env.DEV && props.navItems.length > BOTTOM_NAV_MAX) {
    console.warn(`[AppShell] 底部導覽列最多 ${BOTTOM_NAV_MAX} 項，第 ${BOTTOM_NAV_MAX + 1} 項起不顯示。其他頁面可改放側邊欄（drawerSections）`)
  }
  const bottomItems = computed(() => props.navItems.slice(0, BOTTOM_NAV_MAX))

  const drawer = shallowRef(false)
  const route = useRoute()
  const router = useRouter()

  // 頁面可暫時取代標題與左側的按鈕（useAppBarHeading，例如 dashboard 的面板展開時）
  const heading = shallowRef<AppBarHeading | null>(null)
  provide(appBarHeadingKey, value => {
    heading.value = value
  })

  const title = computed(() => heading.value?.title ?? route.meta.title ?? appName)

  // 自行排版整頁的頁面（例如登入頁）不顯示 App Bar、側邊欄與底部導覽列
  const showShell = computed(() => route.meta.shell !== false)

  const appBarActions = shallowRef<PageAction[]>([])
  provide(appBarActionsKey, actions => {
    appBarActions.value = actions.filter(action => action !== null)
  })

  // 頁面註冊底部動作時（例如表單頁），底部動作暫時取代導覽列，離開頁面時自動還原
  const bottomActions = shallowRef<PageAction[]>([])
  provide(bottomActionsKey, actions => {
    bottomActions.value = actions.filter(action => action !== null)
  })

  // 多選模式的出口。不為 null 時頁面正在多選，搜尋與排序按鈕隱藏
  const cancelSelect = shallowRef<(() => void) | null>(null)
  provide(appBarSelectionKey, cancel => {
    cancelSelect.value = cancel
  })

  // 頁面登記搜尋時才顯示搜尋按鈕，按下後 App Bar 換成輸入框。query 為頁面的 ref，關閉時清空
  const controls = shallowRef<ListControls | null>(null)
  provide(listControlsKey, value => {
    controls.value = value
  })
  const searchOpen = shallowRef(false)

  // 一頁可有多張表的條件（每個頁籤各一張），任一張表有條件即為篩選中
  const drawerTables = computed(() => controls.value?.drawer?.tables ?? [])
  const filterActive = computed(() => drawerTables.value.some(table => hasActiveFilter(table.filters.value)))

  // 有搜尋字串或篩選條件時，放大鏡為主色
  const searchActive = computed(() => (controls.value?.query.value ?? '') !== '' || filterActive.value)

  // 有 sort 的表才有排序按鈕。任一張表不是預設排序即為排序中
  const sortTables = computed(() => drawerTables.value.filter(table => table.sort))
  const sortActive = computed(() => sortTables.value.some(table => table.sort?.value))

  // 換頁時收起搜尋欄與抽屜。回到仍有 query 或篩選的頁面（KeepAlive）時重新打開搜尋欄
  watch(controls, value => {
    searchOpen.value = value !== null && (value.query.value !== '' || filterActive.value)
    drawerMode.value = null
  })

  // 右側抽屜一次只顯示一種面板。篩選按鈕在搜尋欄內，排序按鈕在 App Bar 上
  const drawerMode = shallowRef<'filter' | 'sort' | null>(null)

  // 抽屜關閉的動畫期間，內容保持為原本的面板
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

  // 抽屜開啟時隱藏 FAB
  provide(overlayOpenKey, drawerOpen)

  // 關閉搜尋時清空 query 與所有表的篩選，列表顯示全部的列
  function closeSearch () {
    if (controls.value) {
      controls.value.query.value = ''
    }
    for (const table of drawerTables.value) {
      table.filters.value = {}
    }
    searchOpen.value = false
  }

  // AppShell 執行動作並顯示確認框，頁面只註冊動作
  const runAction = provideActionRunner()

  // 底部導覽列與側邊欄的目的地以外的頁面（例如詳細頁）顯示返回按鈕。頁面取代標題時一律顯示
  const topLevel = computed(() => [...bottomItems.value, ...props.drawerSections.flatMap(section => section.items)])
  const showBack = computed(() => heading.value !== null || !topLevel.value.some(item => item.to === route.path))

  const store = useTablesStore()
  const syncing = shallowRef(false)

  // 先推送，再重新抓取。推送失敗時不重新抓取
  async function sync () {
    syncing.value = true
    try {
      if (await store.refresh()) {
        return
      }

      // Sheet 已被別處修改時整批皆未寫入，佇列保留。詢問使用者如何處理，關閉對話框則不處理
      if (!store.conflict) {
        notify(store.flushError ?? '推送失敗，稍後再試', 'error')
        return
      }

      const picked = await choose('Sheet已被別處修改', '要強制推送，還是重新抓取？', [
        { key: 'discard', label: '放棄並重新抓取' },
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

  // 有未推送的變更時，離開前提示使用者
  function warnUnsaved (event: BeforeUnloadEvent) {
    if (store.hasPending) {
      event.preventDefault()
    }
  }

  onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))

  function handleLeadingIconClick () {
    if (heading.value) {
      heading.value.back()
    } else if (showBack.value) {
      if (navigationCount.value > 1) {
        router.back()
      }
    } else {
      drawer.value = !drawer.value
    }
  }
</script>

<template>
  <v-app-bar v-if="showShell" class="shell-app-bar">
    <!-- 搜尋模式：整條 App Bar 換成返回按鈕與輸入框，不顯示標題與動作 -->
    <template v-if="searchOpen && controls">
      <v-app-bar-nav-icon aria-label="關閉搜尋" :icon="mdiArrowLeft" @click="closeSearch" />

      <!-- clearable 清空時傳回 null，此處轉為空字串 -->
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
      <!-- 多選模式中不顯示搜尋與排序按鈕 -->
      <v-btn
        v-if="controls && !cancelSelect"
        aria-label="搜尋"
        :color="searchActive ? 'primary' : undefined"
        :icon="mdiMagnify"
        @click="searchOpen = true"
      />

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

        <v-list class="action-menu">
          <v-list-item
            v-for="action in appBarActions"
            :key="action.key"
            :prepend-icon="action.icon"
            :title="action.label"
            @click="runAction(action)"
          />
        </v-list>
      </v-menu>

      <!-- 多選的取消按鈕一律置於選單外 -->
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
    :lock-id="fieldsDialog.lockId"
    :schema="fieldsDialog.schema"
    :title="fieldsDialog.title"
    @confirm="confirmFields"
  />

  <!-- 右側抽屜屬於 AppShell，面板只提供內容，一次顯示一種 -->
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

  <NavDrawer v-if="showShell" v-model:open="drawer" :sections="drawerSections" />

  <v-main>
    <slot />
  </v-main>

  <v-bottom-navigation v-if="showShell && bottomActions.length > 0" class="shell-bottom-bar" grow>
    <v-btn
      v-for="action in bottomActions"
      :key="action.key"
      @click="runAction(action)"
    >
      {{ action.label }}
    </v-btn>
  </v-bottom-navigation>

  <!-- 按鈕平分寬度，上限為 Vuetify 預設的最大寬（見 docs/design/README.md 的「導覽」） -->
  <v-bottom-navigation v-else-if="showShell" class="shell-bottom-bar shell-bottom-bar--nav" grow :model-value="route.path">
    <v-btn
      v-for="item in bottomItems"
      :key="item.to"
      replace
      :to="item.to"
      :value="item.to"
    >
      <v-icon :icon="item.icon" />
      <span class="shell-bottom-bar__label">{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/* 換頁動畫中不隨頁面滑動，直接換成新頁面的內容（見 App.vue） */
.shell-app-bar {
  view-transition-name: app-bar;
}

.shell-bottom-bar {
  view-transition-name: bottom-bar;
}

/* 不設最小寬，畫面窄時按鈕縮小，不超出畫面 */
.shell-bottom-bar--nav :deep(.v-btn) {
  min-width: 0;
}

/* 名稱放不下時加「…」 */
.shell-bottom-bar__label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
