<script lang="ts" setup>
  import type { MoveOption, NavItemEntry, NavItemInput } from '../../../shared/navigationForm'
  import { useDragSort } from '@/composables/useDragSort'
  import NavItemRow from './NavItemRow.vue'

  const props = defineProps<{
    entries: readonly NavItemEntry[]
    routes: readonly string[]
    moveOptions: readonly MoveOption[]
    /** 拖曳排序：把 from 移到 to，完成後回傳 */
    reorder: (from: number, to: number) => Promise<unknown>
    /** 只顯示前 limit 項。之後的項目以淡色顯示 */
    limit?: number
    /** 清單為有標題的組 */
    grouped?: boolean
  }>()

  const emit = defineEmits<{
    set: [index: number, name: keyof NavItemInput, value: string]
    move: [index: number, option: number]
    remove: [index: number]
  }>()

  // 拖曳只在同一份清單內
  const sort = useDragSort({
    items: () => props.entries,
    source: () => props.entries,
    commit: (from, to) => props.reorder(from, to),
  })
</script>

<template>
  <TransitionGroup
    class="nav-item-list"
    name="nav-item-list"
    tag="ol"
    @dragover.prevent
    @drop="sort.drop"
  >
    <li
      v-for="(entry, position) in sort.entries.value"
      :key="entry.index"
      class="nav-item-list__item"
      :class="{ 'nav-item-list__item--dragging': sort.dragging.value === entry.index }"
      draggable="true"
      @dragend="sort.end"
      @dragover="sort.over($event, position)"
      @dragstart="sort.start($event, entry.index)"
    >
      <NavItemRow
        v-if="entry.item.kind === 'item'"
        :grouped="grouped"
        :hidden="limit !== undefined && entry.index >= limit"
        :item="entry.item.item"
        :move-options="moveOptions"
        :routes="routes"
        @move="option => emit('move', entry.index, option)"
        @remove="emit('remove', entry.index)"
        @set="(name, value) => emit('set', entry.index, name, value)"
      />

      <span v-else class="text-medium-emphasis">以程式碼寫成：{{ entry.item.text }}</span>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.nav-item-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.nav-item-list__item {
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.nav-item-list__item--dragging {
  opacity: 0.5;
}

.nav-item-list-move {
  transition: transform 0.15s;
}
</style>
