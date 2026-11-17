<script lang="ts" setup>
  import { computed, shallowRef } from 'vue'
  import { insertAtCursor } from '@/components/file/insertTarget'
  import { useFilesStore } from '@/stores/files'
  import { usePreviewStore } from '@/stores/preview'
  import { useProblemsStore } from '@/stores/problems'
  import { tableKeyOfFile } from '../../../shared/tableKeys'
  import BuildTab from './BuildTab.vue'
  import ColumnLookup from './ColumnLookup.vue'
  import ConsoleList from './ConsoleList.vue'
  import ProblemsTab from './ProblemsTab.vue'

  type PanelTab = 'problems' | 'build' | 'columns' | 'console'

  const tab = shallowRef<PanelTab>('problems')
  const files = useFilesStore()
  const preview = usePreviewStore()
  const problems = useProblemsStore()

  const currentTableKey = computed(() => files.currentPath === null
    ? null
    : tableKeyOfFile(files.currentPath, new Set(Object.keys(files.tables))))

  function insert (key: string): void {
    if (!insertAtCursor(key)) {
      files.message = '沒有可插入的文字編輯器。請先開啟一個檔案。'
    }
  }
</script>

<template>
  <section class="bottom-panel">
    <v-tabs
      v-model="tab"
      class="bottom-panel__tabs"
      color="primary"
      density="compact"
    >
      <v-tab value="problems">
        問題
        <span v-if="problems.problems.length > 0" class="ml-1 text-medium-emphasis">{{ problems.problems.length }}</span>
      </v-tab>

      <v-tab text="建置" value="build" />

      <v-tab text="欄位查詢" value="columns" />

      <v-tab value="console">
        控制台
        <span v-if="preview.entries.length > 0" class="ml-1 text-medium-emphasis">{{ preview.entries.length }}</span>
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab" class="bottom-panel__body">
      <v-tabs-window-item class="bottom-panel__item" value="problems">
        <ProblemsTab />
      </v-tabs-window-item>

      <v-tabs-window-item class="bottom-panel__item" value="build">
        <BuildTab />
      </v-tabs-window-item>

      <v-tabs-window-item class="bottom-panel__item" value="columns">
        <ColumnLookup :current-table-key="currentTableKey" :tables="files.tables" @insert="insert" />
      </v-tabs-window-item>

      <v-tabs-window-item class="bottom-panel__item" value="console">
        <ConsoleList :entries="preview.entries" @clear="preview.clearEntries" />
      </v-tabs-window-item>
    </v-tabs-window>
  </section>
</template>

<style scoped>
.bottom-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bottom-panel__tabs {
  flex: none;
}

.bottom-panel__body {
  flex: 1;
  min-height: 0;
}

.bottom-panel__body :deep(.v-window__container) {
  height: 100%;
}

.bottom-panel__item {
  height: 100%;
}
</style>
