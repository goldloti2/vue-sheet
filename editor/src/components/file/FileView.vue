<script lang="ts" setup>
  import type { EditorState } from '@codemirror/state'
  import { computed, shallowRef, watch } from 'vue'
  import ConfigForm from '@/components/config/ConfigForm.vue'
  import NavigationForm from '@/components/navigation/NavigationForm.vue'
  import CsvForm from '@/components/overview/CsvForm.vue'
  import MockOverviewForm from '@/components/overview/MockOverviewForm.vue'
  import OverviewForm from '@/components/overview/OverviewForm.vue'
  import SchemaForm from '@/components/schema/SchemaForm.vue'
  import SettingsPage from '@/components/settings/SettingsPage.vue'
  import { useFilesStore } from '@/stores/files'
  import { CONFIG_FILE } from '../../../shared/configGs'
  import { FORM_ONLY_FILES, SETTINGS_PAGE } from '../../../shared/editorPages'
  import { NAVIGATION_FILE } from '../../../shared/navigationForm'
  import { isMockCsvFile, MOCK_TABLES_FILE } from '../../../shared/tableFiles'
  import { REGISTRY_FILE, tableKeyOf } from '../../../shared/tableKeys'
  import CodeEditor from './CodeEditor.vue'

  type ViewMode = 'form' | 'text'

  const store = useFilesStore()

  // 開啟的對象：檔案的路徑或頁面的識別值。對象為頁面時，file 為 null
  const target = computed(() => store.currentTarget)
  const file = computed(() => store.current)
  const page = computed(() => store.currentPage)
  const dirty = computed(() => store.currentPaths.some(path => store.dirtyPaths.has(path)))
  // 導覽中的位置，例如「表/訂單」。不在導覽中的檔案為 null，頁面至少為頁面的名稱
  const location = computed(() => {
    if (target.value === null) {
      return null
    }
    const found = store.locationOf(target.value)
    return found === target.value ? page.value?.title ?? null : found
  })
  const reveal = computed(() => store.reveal !== null && store.reveal.path === file.value?.path ? store.reveal : null)

  // 表的 schema、兩個總覽、mock CSV、Config.gs 與 navigation.ts 有表單。各檔案共用同一個選擇。設定頁另外顯示
  const mode = shallowRef<ViewMode>('form')
  type FormKind = 'schema' | 'overview' | 'mockOverview' | 'csv' | 'config' | 'navigation'
  const formKind = computed<FormKind | null>(() => {
    const path = file.value?.path ?? null
    if (path === null) {
      return null
    }
    if (tableKeyOf(path) !== null) {
      return 'schema'
    }
    if (path === REGISTRY_FILE) {
      return 'overview'
    }
    if (path === MOCK_TABLES_FILE) {
      return 'mockOverview'
    }
    if (path === CONFIG_FILE) {
      return 'config'
    }
    if (path === NAVIGATION_FILE) {
      return 'navigation'
    }
    return isMockCsvFile(path) ? 'csv' : null
  })
  const hasForm = computed(() => formKind.value !== null)
  // 只有表單的檔案不顯示切換，一律顯示表單
  const formOnly = computed(() => file.value !== null && FORM_ONLY_FILES.has(file.value.path))
  const showForm = computed(() => hasForm.value && (mode.value === 'form' || formOnly.value))

  // 移至某一行時改用文字編輯器
  watch(reveal, target => {
    if (target) {
      mode.value = 'text'
    }
  })

  function onChange (path: string, text: string): void {
    store.setText(path, text)
  }

  // 焦點離開文字編輯器或換到別的檔案時，預覽改用未儲存的內容
  function onLeave (path: string, state: EditorState): void {
    store.setEditorState(path, state)
    void store.syncPreview(path)
  }

  function onBlur (path: string): void {
    void store.syncPreview(path)
  }
</script>

<template>
  <section class="file-view">
    <template v-if="target !== null">
      <v-toolbar class="file-view__toolbar" color="surface" density="compact">
        <!-- 標題為導覽中的位置。不在導覽中時為路徑 -->
        <v-toolbar-title class="text-body-2">
          {{ location ?? target }}
          <span v-if="dirty" class="text-medium-emphasis">（未儲存）</span>
        </v-toolbar-title>

        <v-btn-toggle
          v-if="hasForm && !formOnly"
          v-model="mode"
          border
          class="mr-2"
          color="primary"
          density="compact"
          mandatory
          variant="text"
        >
          <v-btn size="small" text="表單" value="form" />
          <v-btn size="small" text="文字" value="text" />
        </v-btn-toggle>

        <v-btn
          class="mr-2"
          :disabled="!dirty"
          text="放棄修改"
          variant="text"
          @click="store.discard(target)"
        />

        <v-btn
          class="mr-2"
          :disabled="store.dirtyPaths.size === 0"
          text="全部儲存"
          variant="text"
          @click="store.requestSaveAll()"
        />

        <v-btn
          color="primary"
          :disabled="!dirty"
          text="儲存"
          variant="flat"
          @click="store.requestSave(target)"
        />
      </v-toolbar>

      <template v-if="file">
        <OverviewForm
          v-if="showForm && formKind === 'overview'"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <MockOverviewForm
          v-else-if="showForm && formKind === 'mockOverview'"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <CsvForm
          v-else-if="showForm && formKind === 'csv'"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <NavigationForm
          v-else-if="showForm && formKind === 'navigation'"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <ConfigForm
          v-else-if="showForm && formKind === 'config'"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <SchemaForm
          v-else-if="showForm"
          :key="`form-${file.path}`"
          class="file-view__editor"
          :path="file.path"
          :text="file.text"
        />

        <CodeEditor
          v-else
          :key="file.path"
          class="file-view__editor"
          :initial-state="store.editorState(file.path)"
          :path="file.path"
          :reveal="reveal"
          :text="file.text"
          @blur="onBlur"
          @change="onChange"
          @leave="onLeave"
          @revealed="store.clearReveal"
        />
      </template>

      <SettingsPage v-else-if="target === SETTINGS_PAGE" class="file-view__editor" />
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
