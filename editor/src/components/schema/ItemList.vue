<script lang="ts" setup>
  import { mdiArrowDown, mdiArrowUp, mdiClose, mdiDragVertical } from '@mdi/js'
  import { computed } from 'vue'
  import { useDragSort } from '@/composables/useDragSort'

  const props = defineProps<{
    items: readonly string[]
    /** 項目的顯示文字，例如欄位的 key 對應標籤。沒有對應時顯示項目本身 */
    labels?: Readonly<Record<string, string>>
    /** 各項的升冪、降冪。省略時沒有方向 */
    directions?: readonly ('asc' | 'desc')[]
    /** 拖曳排序：把 from 移到 to，完成後回傳。與 checked 擇一 */
    move?: (from: number, to: number) => Promise<unknown>
    /** 勾選：勾選中的項目。以勾選框取代拖曳的把手，沒有移除按鈕 */
    checked?: readonly string[]
  }>()

  const emit = defineEmits<{
    remove: [index: number]
    toggle: [index: number]
    check: [item: string, checked: boolean]
  }>()

  const checking = computed(() => props.checked !== undefined)
  const sort = useDragSort({
    items: () => props.items,
    source: () => props.items,
    commit: (from, to) => props.move?.(from, to) ?? Promise.resolve(),
  })
</script>

<template>
  <TransitionGroup
    class="item-list"
    name="item-list"
    tag="ol"
    @dragover.prevent
    @drop="sort.drop"
  >
    <li
      v-for="(entry, position) in sort.entries.value"
      :key="entry.item"
      class="item-list__item"
      :class="{ 'item-list__item--dragging': sort.dragging.value === entry.index, 'item-list__item--draggable': !checking }"
      :draggable="!checking"
      @dragend="sort.end"
      @dragover="!checking && sort.over($event, position)"
      @dragstart="!checking && sort.start($event, entry.index)"
    >
      <v-checkbox-btn
        v-if="checking"
        class="item-list__check"
        density="compact"
        :model-value="checked!.includes(entry.item)"
        @update:model-value="value => emit('check', entry.item, Boolean(value))"
      />

      <v-icon v-else class="text-medium-emphasis" :icon="mdiDragVertical" size="18" />

      <span class="item-list__text">{{ labels?.[entry.item] ?? entry.item }}</span>

      <v-btn
        v-if="directions?.[entry.index]"
        :aria-label="directions[entry.index] === 'asc' ? '升冪' : '降冪'"
        class="item-list__button"
        :icon="directions[entry.index] === 'asc' ? mdiArrowUp : mdiArrowDown"
        size="x-small"
        variant="text"
        @click="emit('toggle', entry.index)"
      />

      <v-btn
        v-if="!checking"
        aria-label="移除"
        class="item-list__button"
        :icon="mdiClose"
        size="x-small"
        variant="text"
        @click="emit('remove', entry.index)"
      />
    </li>
  </TransitionGroup>
</template>

<style scoped>
.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 每一項各有外框，與 outlined 的輸入框相同 */
.item-list__item {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 32px;
  padding: 0 4px 0 8px;
  border: thin solid rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  border-radius: 4px;
}

.item-list__item--draggable {
  cursor: grab;
}

.item-list__item--dragging {
  opacity: 0.4;
}

.item-list-move {
  transition: transform 150ms ease;
}

.item-list__check {
  flex: none;
  margin-left: -8px;
}

/* 按鈕與圖示的大小固定，不受全域的 compact 密度影響 */
.item-list__button {
  width: 24px;
  height: 24px;
}

.item-list__button :deep(.v-icon) {
  font-size: 16px;
}

.item-list__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
