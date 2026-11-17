<script lang="ts" setup>
  import type { SchemaPath } from '../../../shared/schema'
  import type { CodeSurroundings } from '@/components/file/typeScript'
  import { computed, inject, shallowRef } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import CodeSnippetEditor from './CodeSnippetEditor.vue'

  const props = defineProps<{
    /** 目前的原文。沒有此設定時為 null */
    code: string | null
    /** 此設定所在的物件與屬性名，用於檢查與補全 */
    objectPath: SchemaPath
    name: string
    disabled?: boolean
    /** 寫回。空白時為 null。回傳錯誤訊息時保持開啟 */
    commit: (code: string | null) => Promise<string | null>
  }>()

  const form = inject(SCHEMA_FORM_KEY)!
  const open = shallowRef(false)
  const draft = shallowRef('')
  const error = shallowRef<string | null>(null)
  const surroundings = shallowRef<CodeSurroundings | null>(null)

  // 點下方面板（例如欄位查詢）時保持開啟，點其他地方時關閉
  function onOutside (event: MouseEvent): void {
    if (!(event.target as Element | null)?.closest('.bottom-panel')) {
      menu.value = false
    }
  }

  // Esc 已由編輯器使用時（例如關閉補全的清單）不關閉
  function onEscape (event: KeyboardEvent): void {
    if (!event.defaultPrevented) {
      menu.value = false
    }
  }

  const summary = computed(() => props.code?.replaceAll(/\s+/g, ' ') ?? '')

  // 開啟時取得前後文，關閉時寫回
  const menu = computed({
    get: () => open.value,
    set: async next => {
      if (next) {
        draft.value = props.code ?? ''
        error.value = null
        surroundings.value = await form.codeContext(props.objectPath, props.name)
        open.value = true
        return
      }
      const code = draft.value.trim() === '' ? null : draft.value
      if (code !== props.code) {
        error.value = await props.commit(code)
      }
      open.value = error.value !== null
    },
  })
</script>

<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    :disabled="disabled"
    location="bottom start"
    max-width="560"
    min-width="420"
    persistent
    @click:outside="onOutside"
  >
    <template #activator="{ props: activator }">
      <button
        v-bind="activator"
        class="code-field"
        :class="{ 'code-field--disabled': disabled }"
        :disabled="disabled"
        type="button"
      >
        <span v-if="summary" class="code-field__code">{{ summary }}</span>
        <span v-else class="text-disabled">—</span>
      </button>
    </template>

    <v-card @keydown.esc="onEscape">
      <CodeSnippetEditor v-if="open" v-model="draft" :path="form.path()" :surroundings="() => surroundings" />

      <v-alert
        v-if="error"
        density="compact"
        :text="error"
        type="error"
        variant="tonal"
      />
    </v-card>
  </v-menu>
</template>

<style scoped>
/* 外框與 outlined 的文字輸入框相同 */
.code-field {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  overflow: hidden;
  border: thin solid rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  border-radius: 4px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.code-field:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.code-field--disabled {
  border-color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  cursor: default;
}

.code-field__code {
  overflow: hidden;
  font-family: monospace;
  font-size: 0.75rem;
  text-overflow: ellipsis;
}
</style>
