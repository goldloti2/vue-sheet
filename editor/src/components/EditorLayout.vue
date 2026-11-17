<script lang="ts" setup>
  import { computed, onMounted } from 'vue'
  import FileView from '@/components/file/FileView.vue'
  import ProjectNav from '@/components/nav/ProjectNav.vue'
  import BottomPanel from '@/components/panel/BottomPanel.vue'
  import PreviewPane from '@/components/preview/PreviewPane.vue'
  import { useSaveShortcuts } from '@/composables/useSaveShortcuts'
  import { useFilesStore } from '@/stores/files'

  const store = useFilesStore()
  useSaveShortcuts()

  const snackbar = computed({
    get: () => store.message !== null,
    set: open => {
      if (!open) {
        store.message = null
      }
    },
  })

  onMounted(() => {
    void store.loadIndex()
  })
</script>

<template>
  <div class="editor-layout">
    <ProjectNav
      class="editor-layout__nav"
      :current-path="store.currentPath"
      :dirty-paths="store.dirtyPaths"
      :paths="store.paths"
      :table-labels="store.tableLabels"
      @select="store.open"
    />

    <FileView class="editor-layout__file" />
    <PreviewPane class="editor-layout__preview" />
    <BottomPanel class="editor-layout__panel" />

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
  grid-template-columns: 260px minmax(0, 1fr) 480px;
  grid-template-rows: minmax(0, 1fr) 220px;
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
