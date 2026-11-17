<script lang="ts" setup>
  import type { Problem, VueTscStatus } from '../../../shared/checks'
  import { computed } from 'vue'
  import { useFilesStore } from '@/stores/files'
  import { useProblemsStore } from '@/stores/problems'
  import ProblemList from './ProblemList.vue'

  const problems = useProblemsStore()
  const files = useFilesStore()

  const VUE_TSC_TITLES: Record<VueTscStatus['state'], string> = {
    starting: 'vue-tsc 第一次檢查中',
    checking: 'vue-tsc 檢查中',
    done: 'vue-tsc 已檢查',
    failed: 'vue-tsc 已停止',
  }

  const openablePaths = computed(() => new Set(files.paths))
  const vueTscBusy = computed(() => problems.vueTsc.state === 'starting' || problems.vueTsc.state === 'checking')

  function select (problem: Problem): void {
    if (problem.path !== null) {
      void files.open(problem.path, problem.position ?? undefined)
    }
  }
</script>

<template>
  <div class="problems-tab">
    <div class="problems-tab__toolbar">
      <span class="problems-tab__status text-medium-emphasis">
        <v-progress-circular v-if="vueTscBusy" indeterminate size="12" width="2" />
        {{ VUE_TSC_TITLES[problems.vueTsc.state] }}
      </span>
    </div>

    <div class="problems-tab__body">
      <pre v-if="problems.vueTsc.error" class="problems-tab__error">{{ problems.vueTsc.error }}</pre>
      <ProblemList :openable-paths="openablePaths" :problems="problems.problems" @select="select" />
    </div>
  </div>
</template>

<style scoped>
.problems-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.problems-tab__toolbar {
  display: flex;
  flex: none;
  gap: 12px;
  align-items: center;
  padding: 4px 16px;
  font-size: 0.75rem;
}

.problems-tab__status {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.problems-tab__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.problems-tab__error {
  margin: 0;
  padding: 4px 16px;
  color: rgb(var(--v-theme-error));
  font-size: 0.75rem;
  white-space: pre-wrap;
}
</style>
