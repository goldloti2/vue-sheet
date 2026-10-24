<script lang="ts" setup>
  import TabPanel from '@/components/ui/panel/TabPanel.vue'
  import { useAppBarTabs } from '@/composables/shell/useAppBarTabs'
  import { provideSharedListControls } from '@/composables/shell/useSharedListControls'

  const props = defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })

  // 頁籤列顯示於 App Bar 下方，此元件只保留內容區
  useAppBarTabs(() => ({ tabs: props.tabs, current: model }))

  // 各頁籤中的列表共用一條搜尋字串，同一張表共用篩選與排序，由此統一登記（見 search.md 的「同一頁面中的多張表」）
  provideSharedListControls(model)
</script>

<template>
  <!-- show-arrows 須明確設為 false，預設的 undefined 會在內容上疊一層左右箭頭 -->
  <v-window v-model="model" :mandatory="false" :show-arrows="false" :touch="false">
    <v-window-item v-for="tab in tabs" :key="tab" :value="tab">
      <!-- TabPanel 告知面板中的頁面是否為目前的頁籤，FAB 與 App Bar 的動作依此避免互相覆蓋 -->
      <TabPanel :active="tab === model">
        <!-- 先使用與頁籤同名的具名 slot，沒有時改用 default -->
        <slot :name="tab" :tab="tab">
          <slot :tab="tab" />
        </slot>
      </TabPanel>
    </v-window-item>
  </v-window>
</template>
