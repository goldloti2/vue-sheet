<script lang="ts" setup>
  import { computed, onMounted, shallowRef } from 'vue'
  import FileView from '@/components/file/FileView.vue'
  import SaveConfirmDialog from '@/components/file/SaveConfirmDialog.vue'
  import ProjectNav from '@/components/nav/ProjectNav.vue'
  import DeleteTableDialog from '@/components/overview/DeleteTableDialog.vue'
  import NewTableDialog from '@/components/overview/NewTableDialog.vue'
  import BottomPanel from '@/components/panel/BottomPanel.vue'
  import PreviewPane from '@/components/preview/PreviewPane.vue'
  import { MOBILE_HEIGHT, MOBILE_WIDTH, PREVIEW_GUTTER, PREVIEW_TOOLBAR_HEIGHT } from '@/components/preview/types'
  import { useSaveShortcuts } from '@/composables/useSaveShortcuts'
  import { useTableDialogs } from '@/composables/useTableDialogs'
  import { useFilesStore } from '@/stores/files'
  import { useProblemsStore } from '@/stores/problems'

  const store = useFilesStore()
  const problems = useProblemsStore()
  const { newTableOpen } = useTableDialogs()
  useSaveShortcuts()

  // 預覽欄比手機版縮小後的寬度略寬。視窗不夠高時，手機版縮小，預覽欄隨之變窄
  const previewExpanded = `calc(min(${MOBILE_WIDTH}px, (100vh - ${PREVIEW_TOOLBAR_HEIGHT}px) * ${MOBILE_WIDTH / MOBILE_HEIGHT}) + ${PREVIEW_GUTTER * 2}px)`

  // 收合時只留展開的按鈕
  const PREVIEW_COLLAPSED_WIDTH = '48px'
  const previewCollapsed = shallowRef(false)
  const previewColumn = computed(() => previewCollapsed.value ? PREVIEW_COLLAPSED_WIDTH : previewExpanded)

  // 導覽收合時只留各組的圖示
  const navCollapsed = shallowRef(false)
  const navColumn = computed(() => navCollapsed.value ? '56px' : '316px')

  // 下方面板收合時只留分頁列
  const panelCollapsed = shallowRef(false)
  const panelRow = computed(() => panelCollapsed.value ? 'auto' : '220px')

  const snackbar = computed({
    get: () => store.message !== null,
    set: open => {
      if (!open) {
        store.message = null
      }
    },
  })

  onMounted(() => {
    void store.initialize()
    void problems.load()
  })
</script>

<template>
  <div class="editor-layout">
    <ProjectNav
      v-model:collapsed="navCollapsed"
      class="editor-layout__nav"
      :current-path="store.currentPath"
      :dirty-paths="store.dirtyPaths"
      :mock-csv="store.mockCsv"
      :paths="store.paths"
      :table-labels="store.tableLabels"
      :table-order="store.tableOrder"
      @select="store.open"
    />

    <FileView class="editor-layout__file" />
    <PreviewPane v-model:collapsed="previewCollapsed" class="editor-layout__preview" />
    <BottomPanel v-model:collapsed="panelCollapsed" class="editor-layout__panel" />
    <SaveConfirmDialog />
    <NewTableDialog v-model="newTableOpen" />
    <DeleteTableDialog />

    <v-snackbar v-model="snackbar" multi-line :timeout="-1">
      {{ store.message }}
      <template #actions>
        <v-btn text="關閉" variant="text" @click="snackbar = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.editor-layout {
  display: grid;
  height: 100vh;
  grid-template-columns: v-bind(navColumn) minmax(0, 1fr) v-bind(previewColumn);
  grid-template-rows: minmax(0, 1fr) v-bind(panelRow);
  grid-template-areas:
    'nav file preview'
    'nav panel preview';
}

.editor-layout__nav {
  grid-area: nav;
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.editor-layout__file {
  grid-area: file;
}

.editor-layout__preview {
  grid-area: preview;
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.editor-layout__panel {
  grid-area: panel;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
