<script lang="ts" setup>
  import type { ConsoleEntry } from '../../../shared/preview'
  import { nextTick, useTemplateRef, watch } from 'vue'

  const props = defineProps<{
    entries: readonly ConsoleEntry[]
  }>()

  const emit = defineEmits<{
    clear: []
  }>()

  const ORIGIN_TITLES: Record<ConsoleEntry['origin'], string> = {
    page: '頁面',
    server: 'dev server',
  }

  const list = useTemplateRef<HTMLElement>('list')

  function timeText (time: number): string {
    return new Date(time).toLocaleTimeString('zh-TW', { hour12: false })
  }

  // 新訊息加入時捲至最下方
  watch(() => props.entries.length, async () => {
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight })
  })
</script>

<template>
  <div class="console-list">
    <div class="console-list__actions">
      <v-btn
        :disabled="entries.length === 0"
        size="small"
        text="清除"
        variant="text"
        @click="emit('clear')"
      />
    </div>

    <div v-if="entries.length === 0" class="console-list__empty text-medium-emphasis">
      沒有訊息
    </div>

    <ol v-else ref="list" class="console-list__entries">
      <li
        v-for="(entry, index) in entries"
        :key="`${entry.time}-${index}`"
        class="console-list__entry"
        :class="`console-list__entry--${entry.level}`"
      >
        <span class="text-medium-emphasis">{{ timeText(entry.time) }}</span>
        <span class="text-medium-emphasis">{{ ORIGIN_TITLES[entry.origin] }}</span>
        <span class="console-list__text">{{ entry.text }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.console-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.console-list__actions {
  display: flex;
  justify-content: flex-end;
  flex: none;
  padding: 0 8px;
}

.console-list__empty {
  padding: 0 16px;
}

.console-list__entries {
  flex: 1;
  margin: 0;
  padding: 0 16px 8px;
  overflow-y: auto;
  list-style: none;
  font-family: monospace;
  font-size: 0.75rem;
}

.console-list__entry {
  display: grid;
  grid-template-columns: max-content max-content minmax(0, 1fr);
  gap: 12px;
  padding: 2px 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.console-list__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.console-list__entry--warn .console-list__text {
  color: rgb(var(--v-theme-warning));
}

.console-list__entry--error .console-list__text {
  color: rgb(var(--v-theme-error));
}
</style>
