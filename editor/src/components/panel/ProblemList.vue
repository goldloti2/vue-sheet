<script lang="ts" setup>
  import type { Problem, ProblemSource } from '../../../shared/checks'
  import { mdiAlert, mdiAlertCircle, mdiInformation } from '@mdi/js'

  defineProps<{
    problems: readonly Problem[]
    /** 可以開啟的檔案。其他檔案的問題不可點擊 */
    openablePaths: ReadonlySet<string>
  }>()

  const emit = defineEmits<{
    select: [problem: Problem]
  }>()

  const SOURCE_TITLES: Record<ProblemSource, string> = {
    'ts': '即時檢查',
    'eslint': 'ESLint',
    'vue-tsc': 'vue-tsc',
    'vite': 'Vite',
  }

  const SEVERITY_ICONS: Record<Problem['severity'], { icon: string, color: string }> = {
    error: { icon: mdiAlertCircle, color: 'error' },
    warning: { icon: mdiAlert, color: 'warning' },
    info: { icon: mdiInformation, color: 'info' },
  }

  const SRC_PREFIX = 'vue-build/src/'

  // vue-build/src 中的檔案省略此前綴
  function locationText (problem: Problem): string {
    if (problem.path === null) {
      return ''
    }
    const path = problem.path.startsWith(SRC_PREFIX) ? problem.path.slice(SRC_PREFIX.length) : problem.path
    return problem.position ? `${path}:${problem.position.line}:${problem.position.column}` : path
  }

  function firstLine (message: string): string {
    return message.split('\n', 1)[0] ?? ''
  }

  function openable (problem: Problem, paths: ReadonlySet<string>): boolean {
    return problem.path !== null && paths.has(problem.path)
  }
</script>

<template>
  <div v-if="problems.length === 0" class="problem-list__empty text-medium-emphasis">
    沒有問題
  </div>

  <ol v-else class="problem-list">
    <li
      v-for="(problem, index) in problems"
      :key="index"
      class="problem-list__item"
      :class="{ 'problem-list__item--openable': openable(problem, openablePaths) }"
      :title="problem.message"
      @click="openable(problem, openablePaths) && emit('select', problem)"
    >
      <v-icon
        :color="SEVERITY_ICONS[problem.severity].color"
        :icon="SEVERITY_ICONS[problem.severity].icon"
        size="16"
      />

      <span class="problem-list__message">{{ firstLine(problem.message) }}</span>
      <span class="problem-list__location text-medium-emphasis">{{ locationText(problem) }}</span>
      <span class="text-medium-emphasis">{{ [SOURCE_TITLES[problem.source], problem.code].filter(Boolean).join(' ') }}</span>
    </li>
  </ol>
</template>

<style scoped>
.problem-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.75rem;
}

.problem-list__empty {
  padding: 8px 16px;
}

.problem-list__item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content max-content;
  gap: 12px;
  align-items: center;
  padding: 2px 16px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.problem-list__item--openable {
  cursor: pointer;
}

.problem-list__item--openable:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.problem-list__message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.problem-list__location {
  font-family: monospace;
}
</style>
