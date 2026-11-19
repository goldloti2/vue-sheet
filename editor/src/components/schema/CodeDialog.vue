<script lang="ts" setup>
  import type { SchemaPath } from '../../../shared/schema'
  import type { CodeSurroundings } from '@/components/file/typeScript'
  import { computed, inject, shallowRef, watch } from 'vue'
  import { insertAtCursor } from '@/components/file/insertTarget'
  import ColumnLookup from '@/components/panel/ColumnLookup.vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { tableKeyOfFile } from '../../../shared/tableKeys'
  import CodeSnippetEditor from './CodeSnippetEditor.vue'

  const props = defineProps<{
    /** 對話框的標題，例如設定的名稱 */
    title: string
    /** types.ts 中此設定的說明 */
    doc?: string | null
    /** 目前的原文。沒有此設定時為 null */
    code: string | null
    /** 此設定所在的物件與屬性名，用於檢查與補全 */
    objectPath: SchemaPath
    name: string
    /** 寫回。空白時為 null。回傳錯誤訊息時保持開啟 */
    commit: (code: string | null) => Promise<string | null>
  }>()

  const open = defineModel<boolean>({ required: true })

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()
  const draft = shallowRef('')
  const error = shallowRef<string | null>(null)
  const surroundings = shallowRef<CodeSurroundings | null>(null)
  // 取得前後文後才建立編輯區
  const ready = shallowRef(false)
  // 有修改時關閉前的確認
  const confirming = shallowRef(false)

  const result = computed(() => draft.value.trim() === '' ? null : draft.value)
  const changed = computed(() => result.value !== props.code)
  const currentTableKey = computed(() => tableKeyOfFile(form.path(), new Set(Object.keys(files.tables))))
  // 標題的開頭為表名，例如 訂單/初始值：價格
  const fullTitle = computed(() => {
    const key = currentTableKey.value
    return key === null ? props.title : `${files.tables[key]?.label ?? key}/${props.title}`
  })

  watch(open, async next => {
    if (!next) {
      ready.value = false
      return
    }
    draft.value = props.code ?? ''
    error.value = null
    confirming.value = false
    surroundings.value = await form.codeContext(props.objectPath, props.name)
    ready.value = true
  }, { immediate: true })

  // 寫回並關閉。有錯誤時保持開啟
  async function done (): Promise<void> {
    confirming.value = false
    if (changed.value) {
      error.value = await props.commit(result.value)
      if (error.value !== null) {
        return
      }
    }
    open.value = false
  }

  // 點對話框外或按 Esc：有修改時先確認
  function requestClose (): void {
    if (changed.value) {
      confirming.value = true
    } else {
      open.value = false
    }
  }

  // Esc 已由編輯器使用時（例如關閉補全的清單）不關閉
  function onEscape (event: KeyboardEvent): void {
    if (!event.defaultPrevented && !confirming.value) {
      requestClose()
    }
  }

  function insert (key: string): void {
    insertAtCursor(key)
  }
</script>

<template>
  <v-dialog
    v-model="open"
    class="code-dialog"
    height="80vh"
    persistent
    width="800"
    @click:outside="requestClose"
  >
    <v-card class="code-dialog__card" :title="fullTitle" @keydown.esc="onEscape">
      <v-card-text class="code-dialog__body">
        <p v-if="doc" class="code-dialog__doc text-caption text-medium-emphasis">{{ doc }}</p>

        <div class="code-dialog__editor">
          <CodeSnippetEditor
            v-if="ready"
            v-model="draft"
            :path="form.path()"
            :surroundings="() => surroundings"
          />
        </div>

        <v-alert
          v-if="error"
          class="code-dialog__error"
          density="compact"
          :text="error"
          type="error"
          variant="tonal"
        />

        <!-- 查詢區。日後可加入其他分頁 -->
        <div class="code-dialog__lookup">
          <v-tabs class="code-dialog__tabs" color="primary" density="compact" :model-value="'columns'">
            <v-tab text="欄位查詢" value="columns" />
          </v-tabs>

          <ColumnLookup class="code-dialog__lookup-body" :current-table-key="currentTableKey" :tables="files.tables" @insert="insert" />
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="取消" @click="open = false" />
        <v-btn color="primary" text="完成" @click="done" />
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirming" max-width="360">
      <v-card text="程式碼已修改。要套用修改並關閉嗎？" title="關閉">
        <v-card-actions>
          <v-spacer />
          <v-btn text="返回" @click="confirming = false" />
          <v-btn color="primary" text="套用並關閉" @click="done" />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
/* 編輯區與查詢區依固定的比例分配高度（見 docs/layout.md）。對話框的高度由 v-dialog 的 height 指定，卡片的高度不生效 */
.code-dialog__body.v-card-text {
  display: flex;
  flex: 1 1 0px;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* 說明緊接於標題之下 */
.code-dialog__card :deep(.v-card-item) {
  padding-bottom: 0;
}

.code-dialog__doc {
  flex: none;
  margin-bottom: -4px;
  white-space: pre-line;
}

/* flex-basis 刻意為 0px：0% 在高度不確定時會改依內容的高度分配 */
.code-dialog__editor {
  flex: 5 1 0px;
  min-height: 0;
  border: thin solid rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  border-radius: 4px;
  overflow: hidden;
}

.code-dialog__error {
  flex: none;
}

.code-dialog__lookup {
  display: flex;
  flex: 3 1 0px;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.code-dialog__tabs {
  flex: none;
}

.code-dialog__lookup-body {
  flex: 1 1 0px;
  min-height: 0;
}
</style>
