<script lang="ts" setup>
  import type { EditorState } from '@codemirror/state'
  import { computed } from 'vue'
  import { useFilesStore } from '@/stores/files'
  import CodeEditor from './CodeEditor.vue'

  const store = useFilesStore()

  const file = computed(() => store.current)
  const dirty = computed(() => file.value !== null && store.dirtyPaths.has(file.value.path))

  function onChange (path: string, text: string): void {
    store.setText(path, text)
  }

  function onLeave (path: string, state: EditorState): void {
    store.setEditorState(path, state)
  }
</script>

<template>
  <section class="file-view">
    <template v-if="file">
      <v-toolbar class="file-view__toolbar" color="surface" density="compact">
        <v-toolbar-title class="text-body-2">
          {{ file.path }}
          <span v-if="dirty" class="text-medium-emphasis">（未儲存）</span>
        </v-toolbar-title>

        <v-btn :disabled="!dirty" text="放棄修改" variant="text" @click="store.discard(file.path)" />
        <v-btn :disabled="store.dirtyPaths.size === 0" text="全部儲存" variant="text" @click="store.saveAll()" />

        <v-btn
          color="primary"
          :disabled="!dirty"
          text="儲存"
          variant="flat"
          @click="store.save(file.path)"
        />
      </v-toolbar>

      <CodeEditor
        :key="file.path"
        class="file-view__editor"
        :initial-state="store.editorState(file.path)"
        :path="file.path"
        :text="file.text"
        @change="onChange"
        @leave="onLeave"
      />
    </template>

    <div v-else class="file-view__empty text-medium-emphasis">
      從左側選擇一個檔案
    </div>
  </section>
</template>

<style scoped>
.file-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.file-view__toolbar {
  flex: none;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.file-view__editor {
  flex: 1;
  min-height: 0;
}

.file-view__empty {
  margin: auto;
}
</style>
