<script lang="ts" setup>
  defineProps<{
    tabs: string[]
  }>()

  const model = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <v-tabs v-model="model" align-tabs="center" grow>
      <v-tab v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</v-tab>
    </v-tabs>

    <!-- show-arrows 預設是 undefined，不明確關掉的話 v-window 會在內容上疊一層左右箭頭按鈕 -->
    <v-window v-model="model" :mandatory="false" :show-arrows="false" :touch="false">
      <v-window-item v-for="tab in tabs" :key="tab" :value="tab">
        <!-- 每個頁籤的內容不一定同構，所以先找同名的具名 slot，沒有才退回 default -->
        <slot :name="tab" :tab="tab">
          <slot :tab="tab" />
        </slot>
      </v-window-item>
    </v-window>
  </div>
</template>
