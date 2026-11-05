<script lang="ts" setup>
  import type { AppNavSection } from '@/components/ui/shell/AppShell.vue'
  import { mdiLogout } from '@mdi/js'
  import { ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { confirm } from '@/composables/shell/useDialogs'
  import { appName, authMethod } from '@/config/app'
  import { clearToken } from '@/services/auth/token'
  import { useTablesStore } from '@/stores/tables'

  // 左側的側邊欄：App 名稱、可展開的頁面分組與登出（見 docs/components/shell/NavDrawer.md）
  const { sections } = defineProps<{
    sections: AppNavSection[]
  }>()

  const open = defineModel<boolean>('open', { required: true })

  const route = useRoute()
  const store = useTablesStore()

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
    v-model="open"
    class="nav-drawer"
    disable-resize-watcher
    order="-1"
    temporary
  >
    <div class="nav-drawer__title text-title-medium">{{ appName }}</div>

    <!-- 預設收起。開啟後浮在內容上，點擊側邊欄以外的地方或換頁後收起 -->
    <!-- 與底部導覽列相同，換頁不留下上一頁 -->
    <v-list v-model:opened="opened" class="nav-drawer__list" nav>
      <template v-for="(section, index) in sections" :key="section.title ?? index">
        <!-- 有標題的組可以展開與收合，沒有標題的組直接列出 -->
        <v-list-group v-if="section.title" :value="section.title">
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
          />
        </template>
      </template>
    </v-list>

    <template v-if="authMethod !== 'none'" #append>
      <v-divider />

      <v-list nav>
        <v-list-item :prepend-icon="mdiLogout" title="登出" @click="logout" />
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

/* 組內的頁面不另外縮一個圖示欄的寬度，只縮一層（見 docs/design/README.md） */
.nav-drawer__list {
  --v-list-group-prepend: 0px;
}
</style>
