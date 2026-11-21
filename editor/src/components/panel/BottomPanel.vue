<script lang="ts" setup>
  import { mdiChevronDown, mdiChevronUp } from '@mdi/js'
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

  // 收合時只留分頁列。點選任一分頁即展開
  const collapsed = defineModel<boolean>('collapsed', { default: false })

  const tab = shallowRef<PanelTab>('problems')
  const files = useFilesStore()
  const preview = usePreviewStore()
  const problems = useProblemsStore()

  // 頁面沒有對應的表
  const currentTableKey = computed(() => files.current === null
    ? null
    : tableKeyOfFile(files.current.path, new Set(Object.keys(files.tables))))

  // 收合時沒有選取的分頁，點選任一分頁皆會觸發
  function openTab (value: unknown): void {
    if (typeof value === 'string') {
      tab.value = value as PanelTab
      collapsed.value = false
    }
  }

  function insert (key: string): void {
    if (!insertAtCursor(key)) {
      files.message = '沒有可插入的文字編輯器。請先開啟一個檔案。'
    }
  }
</script>

<template>
  <section class="bottom-panel">
    <div class="bottom-panel__header">
      <v-tabs
        color="primary"
        density="compact"
        :mandatory="collapsed ? false : 'force'"
        :model-value="collapsed ? null : tab"
        @update:model-value="openTab"
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

      <v-spacer />

      <v-btn
        :aria-label="collapsed ? '展開下方面板' : '收合下方面板'"
        class="mr-2"
        icon
        size="small"
        variant="text"
        @click="collapsed = !collapsed"
      >
        <v-icon :icon="collapsed ? mdiChevronUp : mdiChevronDown" />
        <v-tooltip activator="parent" location="top" :text="collapsed ? '展開下方面板' : '收合下方面板'" />
      </v-btn>
    </div>

    <v-tabs-window v-show="!collapsed" v-model="tab" class="bottom-panel__body">
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

.bottom-panel__header {
  display: flex;
  flex: none;
  align-items: center;
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
