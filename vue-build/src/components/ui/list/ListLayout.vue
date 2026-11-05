<script lang="ts" setup>
  // 列表中各列的外框：list 依序往下排列，grid 為格狀排列（gallery）。ListPage 與 GroupedList 共用
  const { layout = 'list' } = defineProps<{
    layout?: 'list' | 'grid'
  }>()
</script>

<template>
  <div class="list-layout" :class="{ 'list-grid': layout === 'grid' }">
    <slot />
  </div>
</template>

<style scoped>
/* 列表元件以 cqw 依此處的寬度估計畫面外各列的高度（見 DataCard）。不具名，不影響 dashboard 的窄版判斷 */
.list-layout {
  container-type: inline-size;
}

/* list 式的列貼齊外緣。卡片（profile、card、gallery）四周留白，放得下陰影（見 docs/design/list.md） */
.list-layout:has(> .list-card),
.list-grid {
  padding: 16px;
}

.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--list-card-gap);
}
</style>
