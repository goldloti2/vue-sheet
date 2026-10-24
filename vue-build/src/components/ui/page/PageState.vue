<script lang="ts" setup>
  withDefaults(defineProps<{
    loading?: boolean
    // 載入失敗的訊息。動作失敗（送出、推送）不經過此處，內容須留在畫面上
    error?: string | null
    // 已載入但沒有內容可顯示，用於顯示單一列的頁面。列表不使用
    empty?: boolean
    emptyText?: string
    // 列表使用貼在內容上緣的長條（保留內容），單一列的頁面使用置中的圓圈（取代內容）
    spinner?: 'circular' | 'linear'
  }>(), {
    error: null,
    emptyText: '找不到這筆資料',
    spinner: 'circular',
  })
</script>

<template>
  <v-container v-if="loading && spinner === 'circular'">
    <v-progress-circular indeterminate />
  </v-container>

  <v-container v-else-if="error">
    <v-alert :text="error" type="error" />
  </v-container>

  <v-container v-else-if="empty">
    <v-alert :text="emptyText" type="warning" />
  </v-container>

  <template v-else>
    <!-- 重新整理時列表留在畫面上，不卸載重建，分組的展開狀態與捲動位置才得以保留 -->
    <v-progress-linear v-if="loading" indeterminate />

    <slot />
  </template>
</template>
