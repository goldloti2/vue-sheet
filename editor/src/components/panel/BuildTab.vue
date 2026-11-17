<script lang="ts" setup>
  import type { BuildState } from '../../../shared/checks'
  import { computed, nextTick, useTemplateRef, watch } from 'vue'
  import { useProblemsStore } from '@/stores/problems'

  const problems = useProblemsStore()
  const output = useTemplateRef<HTMLElement>('output')

  const BUILD_TITLES: Record<BuildState, string> = {
    idle: '尚未建置',
    running: '建置中',
    succeeded: '建置成功',
    failed: '建置失敗',
  }

  const building = computed(() => problems.build.state === 'running')

  // 新的輸出加入時捲至最下方
  watch(() => problems.build.lines, async () => {
    await nextTick()
    output.value?.scrollTo({ top: output.value.scrollHeight })
  })
</script>

<template>
  <div class="build-tab">
    <div class="build-tab__toolbar">
      <v-btn
        :loading="building"
        size="small"
        text="vite build"
        variant="tonal"
        @click="problems.runBuild()"
      />

      <span class="text-medium-emphasis">{{ BUILD_TITLES[problems.build.state] }}</span>
    </div>

    <pre v-if="problems.build.lines.length > 0" ref="output" class="build-tab__output">{{ problems.build.lines.join('\n') }}</pre>

    <div v-else class="build-tab__empty text-medium-emphasis">
      按「vite build」建置至 vue-build/dist
    </div>
  </div>
</template>

<style scoped>
.build-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.build-tab__toolbar {
  display: flex;
  flex: none;
  gap: 12px;
  align-items: center;
  padding: 4px 16px;
  font-size: 0.75rem;
}

.build-tab__output {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 4px 16px 8px;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.build-tab__empty {
  padding: 4px 16px;
  font-size: 0.75rem;
}
</style>
