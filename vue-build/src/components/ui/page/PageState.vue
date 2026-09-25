<script lang="ts" setup>
  withDefaults(defineProps<{
    loading?: boolean
    // 載入失敗的訊息。動作失敗（送出、推送）不走這裡，那種要讓內容留在畫面上
    error?: string | null
    // 載入完了但沒東西可顯示（單筆的頁面用，列表空著就是空著）
    empty?: boolean
    emptyText?: string
    // 列表用長條貼在內容上緣，單筆用置中的圓圈
    spinner?: 'circular' | 'linear'
  }>(), {
    error: null,
    emptyText: '找不到這筆資料',
    spinner: 'circular',
  })
</script>

<template>
  <v-progress-linear v-if="loading && spinner === 'linear'" indeterminate />

  <v-container v-else-if="loading">
    <v-progress-circular indeterminate />
  </v-container>

  <v-container v-else-if="error">
    <v-alert :text="error" type="error" />
  </v-container>

  <v-container v-else-if="empty">
    <v-alert :text="emptyText" type="warning" />
  </v-container>

  <slot v-else />
</template>
