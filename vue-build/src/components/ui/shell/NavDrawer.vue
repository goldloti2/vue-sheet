<script lang="ts" setup>
  import type { AppNavItem, AppNavSection } from '@/components/ui/shell/AppShell.vue'
  import { mdiLogout, mdiMenu } from '@mdi/js'
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { desktopSections } from '@/components/ui/shell/navSections'
  import { useCompactLayout } from '@/composables/shell/useCompactLayout'
  import { confirm } from '@/composables/shell/useDialogs'
  import { appName, authMethod } from '@/config/app'
  import { clearToken } from '@/services/auth/token'
  import { useTablesStore } from '@/stores/tables'

  // 左側的側邊欄：App 名稱、可展開的頁面分組與登出（見 docs/components/shell/NavDrawer.md）
  const { navItems, sections } = defineProps<{
    // 底部導覽列的頁面，電腦版列於側邊欄的最上方
    navItems: AppNavItem[]
    sections: AppNavSection[]
  }>()

  // 手機版是否開啟
  const open = defineModel<boolean>('open', { required: true })
  // 電腦版是否收合為圖示列
  const rail = defineModel<boolean>('rail', { required: true })

  const route = useRoute()
  const store = useTablesStore()

  // 手機版浮在內容上，平時收起。電腦版固定於左側，一律顯示
  const compact = useCompactLayout()
  const shown = computed({
    get: () => !compact.value || open.value,
    set: value => {
      if (compact.value) {
        open.value = value
      }
    },
  })
  const railed = computed(() => !compact.value && rail.value)

  const shownSections = computed(() => compact.value ? sections : desktopSections(navItems, sections))

  // 展開的組。目前頁面所在的組自動展開，其他組維持使用者的選擇
  const opened = ref<string[]>([])
  watch(() => route.path, path => {
    const current = sections.find(section => section.title && section.items.some(item => item.to === path))
    if (current?.title && !opened.value.includes(current.title)) {
      opened.value = [...opened.value, current.title]
    }
    // 換頁後收起
    open.value = false
  }, { immediate: true })

  // 清除 token 後 router 導向登入頁。未推送的變更留在佇列中，重新登入後照常推送
  async function logout () {
    if (store.hasPending && !await confirm('登出', '有尚未推送的變更，確定要登出嗎？')) {
      return
    }
    clearToken()
  }
</script>

<template>
  <v-navigation-drawer
    v-model="shown"
    class="nav-drawer"
    disable-resize-watcher
    order="-1"
    :permanent="!compact"
    :rail="railed"
    :temporary="compact"
  >
    <!-- 最上一列固定，不隨清單捲動。電腦版與 App Bar 同高，收合鍵位於左端，收合後只剩收合鍵 -->
    <template #prepend>
      <div :class="compact ? 'nav-drawer__title' : 'nav-drawer__bar'">
        <v-btn
          v-if="!compact"
          :aria-label="rail ? '展開側邊欄' : '收合側邊欄'"
          :icon="mdiMenu"
          variant="text"
          @click="rail = !rail"
        />

        <span v-if="!railed" class="text-title-medium">{{ appName }}</span>
      </div>
    </template>

    <!-- 手機版預設收起。開啟後浮在內容上，點擊側邊欄以外的地方或換頁後收起 -->
    <!-- 與底部導覽列相同，換頁不留下上一頁，目前的頁面以主色標示 -->
    <v-list v-model:opened="opened" class="nav-drawer__list" color="primary" nav>
      <template v-for="(section, index) in shownSections" :key="section.title ?? index">
        <!-- 電腦版的組之間以分隔線分開 -->
        <v-divider v-if="!compact && index > 0" class="nav-drawer__divider" />

        <!-- 有標題的組可以展開與收合，沒有標題的組直接列出。收合為圖示列時一律直接列出 -->
        <v-list-group v-if="section.title && !railed" :value="section.title">
          <template #activator="{ props: activator }">
            <v-list-item v-bind="activator" :prepend-icon="section.icon" :title="section.title" />
          </template>

          <v-list-item
            v-for="item in section.items"
            :key="item.to"
            :prepend-icon="item.icon"
            replace
            :title="item.title"
            :to="item.to"
          />
        </v-list-group>

        <template v-else>
          <v-list-item
            v-for="item in section.items"
            :key="item.to"
            :prepend-icon="item.icon"
            replace
            :title="item.title"
            :to="item.to"
          >
            <v-tooltip v-if="railed" activator="parent" location="end" :text="item.title" />
          </v-list-item>
        </template>
      </template>
    </v-list>

    <template v-if="authMethod !== 'none'" #append>
      <v-divider />

      <v-list nav>
        <v-list-item :prepend-icon="mdiLogout" title="登出" @click="logout">
          <v-tooltip v-if="railed" activator="parent" location="end" text="登出" />
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
/* 換頁動畫中不隨頁面滑動（見 App.vue） */
.nav-drawer {
  view-transition-name: nav-drawer;
}

.nav-drawer__title {
  padding: 16px 16px 8px;
}

/* 高度與 App Bar 相同，收合鍵與 App Bar 的返回鍵並排。收合鍵與頁面的圖示展開與收合時位置不變（見 docs/design/README.md 的「導覽」） */
.nav-drawer__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 58px;
  padding-inline: 4px;
}

/* 收合為圖示列時，頁面為正方形，圖示的位置與展開時相同 */
.v-navigation-drawer--rail .v-list {
  padding-inline: 4px;
}

.v-navigation-drawer--rail .v-list-item {
  padding-inline: 12px;
}

/* 收合為圖示列時不顯示捲軸，捲軸不佔用頁面的寬度 */
.v-navigation-drawer--rail :deep(.v-navigation-drawer__content) {
  scrollbar-width: none;
}

.nav-drawer__divider {
  margin-block: 4px;
}

/* 組內的頁面不另外縮一個圖示欄的寬度，只縮一層（見 docs/design/README.md） */
.nav-drawer__list {
  --v-list-group-prepend: 0px;
}
</style>
