<script lang="ts" setup>
  defineProps<{
    label: string
    count: number
  }>()
</script>

<template>
  <span class="count-label">
    <span>{{ label }}</span>

    <span class="count-label__count">{{ count }}</span>
  </span>
</template>

<style scoped>
.count-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 自己畫而不是用 v-chip：chip 的內距與行高會跟著外面的標題樣式跑，數字站不正 */
.count-label__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1;
}
</style>
