<script lang="ts" setup>
  // 列表中各筆的外框：list 依序往下排、不另外包裝；grid 為格狀排列（gallery）。ListPage 與 GroupedList 共用
  const { layout = 'list' } = defineProps<{
    layout?: 'list' | 'grid'
  }>()
</script>

<template>
  <div v-if="layout === 'grid'" class="list-grid">
    <slot />
  </div>

  <slot v-else />
</template>

<style scoped>
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--list-card-gap);
  /* 分組展開的動畫期間，最後一列的陰影亦落在裁切範圍內 */
  padding-bottom: var(--list-card-shadow-extent);
}
</style>
