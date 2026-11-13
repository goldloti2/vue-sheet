<script lang="ts" setup>
  import { provide } from 'vue'
  import TabPanel from '@/components/ui/panel/TabPanel.vue'
  import { registerSlot } from '@/composables/shell/useActionSlot'
  import { currentTabKey } from '@/composables/shell/useCurrentTab'
  import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'
  import { listControlsKey } from '@/composables/shell/useListControls'
  import { provideSharedListControls } from '@/composables/shell/useSharedListControls'

  defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })

  // 目前的頁籤，供頁籤中的頁面得知使用者切換頁籤（例如取消多選）
  provide(currentTabKey, model)

  // 各頁籤中的列表共用一條搜尋字串，同一張表共用篩選與排序，由此統一登記（見 search.md 的「同一頁面中的多張表」）。
  // 位於加入共用的 dashboard 面板中時不另外建立，頁籤中的列表直接加入 dashboard 的一份
  if (!useDashboardPanel()?.shared()) {
    const controls = provideSharedListControls(model)
    registerSlot(listControlsKey, () => controls.value, null)
  }
</script>

<template>
  <div>
    <!-- 頁籤列置於 v-window 之外，切換頁籤時只有內容滑動 -->
    <!-- 高度與頁籤的寬度見 docs/design/tab.md 的「外觀與切換」 -->
    <v-tabs
      v-model="model"
      align-tabs="center"
      class="tab-page__bar"
      grow
      height="44"
      slider-color="primary"
    >
      <v-tab v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</v-tab>
    </v-tabs>

    <!-- show-arrows 須明確設為 false，預設的 undefined 會在內容上疊一層左右箭頭 -->
    <v-window v-model="model" :mandatory="false" :show-arrows="false" :touch="false">
      <v-window-item v-for="tab in tabs" :key="tab" :value="tab">
        <!-- TabPanel 告知面板中的頁面是否為目前的頁籤，FAB 與 App Bar 的動作依此避免互相覆蓋 -->
        <TabPanel :active="tab === model" :tab="tab">
          <!-- 先使用與頁籤同名的具名 slot，沒有時改用 default -->
          <slot :name="tab" :tab="tab">
            <slot :tab="tab" />
          </slot>
        </TabPanel>
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
/* 捲動時固定於 App Bar 下緣。面板中由 DashboardPanel 把 --v-layout-top 設為 0，固定於面板的上緣 */
.tab-page__bar {
  position: sticky;
  top: var(--v-layout-top, 0px);
  z-index: 2;
  background-color: rgb(var(--v-theme-surface));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 頁籤不設最小寬 */
.tab-page__bar :deep(.v-tab) {
  min-width: 0;
  padding-inline: 8px;
}
</style>
