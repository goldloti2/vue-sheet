<script lang="ts" setup>
  import { useAppBarTabs } from '@/composables/shell/useAppBarTabs'

  const props = defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })

  // 頁籤列畫在 App Bar 底下，這裡只留內容區
  useAppBarTabs(() => ({ tabs: props.tabs, current: model }))
</script>

<template>
  <!-- show-arrows 預設是 undefined，不明確關掉的話 v-window 會在內容上疊一層左右箭頭按鈕 -->
  <v-window v-model="model" :mandatory="false" :show-arrows="false" :touch="false">
    <v-window-item v-for="tab in tabs" :key="tab" :value="tab">
      <!-- 每個頁籤的內容不一定同構，所以先找同名的具名 slot，沒有才退回 default -->
      <slot :name="tab" :tab="tab">
        <slot :tab="tab" />
      </slot>
    </v-window-item>
  </v-window>
</template>
