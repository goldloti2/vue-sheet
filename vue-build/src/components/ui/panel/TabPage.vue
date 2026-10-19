<script lang="ts" setup>
  import TabPanel from '@/components/ui/panel/TabPanel.vue'
  import { useAppBarTabs } from '@/composables/shell/useAppBarTabs'
  import { provideSharedListControls } from '@/composables/shell/useSharedListControls'

  const props = defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })

  // 頁籤列畫在 App Bar 底下，這裡只留內容區
  useAppBarTabs(() => ({ tabs: props.tabs, current: model }))

  // 各頁籤中的列表共用一條搜尋字串，同一張表共用篩選與排序，由此統一登記（見 docs/topics/search.md 的「同一頁面中的多張表」）。
  provideSharedListControls(model)
</script>

<template>
  <!-- show-arrows 預設是 undefined，不明確關掉的話 v-window 會在內容上疊一層左右箭頭按鈕 -->
  <v-window v-model="model" :mandatory="false" :show-arrows="false" :touch="false">
    <v-window-item v-for="tab in tabs" :key="tab" :value="tab">
      <!-- 包一層才能告訴面板裡的頁面「現在輪到我沒」，FAB 與 App Bar 動作靠它避免互相蓋掉 -->
      <TabPanel :active="tab === model">
        <!-- 每個頁籤的內容不一定同構，所以先找同名的具名 slot，沒有才退回 default -->
        <slot :name="tab" :tab="tab">
          <slot :tab="tab" />
        </slot>
      </TabPanel>
    </v-window-item>
  </v-window>
</template>
