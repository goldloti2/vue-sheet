<script lang="ts" setup>
  import type { SchemaPath } from '../../../shared/schema'
  import { computed, shallowRef } from 'vue'
  import CodeDialog from './CodeDialog.vue'

  const props = defineProps<{
    /** 目前的原文。沒有此設定時為 null */
    code: string | null
    /** 此設定所在的物件與屬性名，用於檢查與補全 */
    objectPath: SchemaPath
    name: string
    /** 對話框的標題 */
    title: string
    /** types.ts 中此設定的說明 */
    doc?: string | null
    disabled?: boolean
    /** 寫回。空白時為 null。回傳錯誤訊息時保持開啟 */
    commit: (code: string | null) => Promise<string | null>
  }>()

  // 根元素有兩個，class 等屬性加在方框上
  defineOptions({ inheritAttrs: false })

  const open = shallowRef(false)
  const summary = computed(() => props.code?.replaceAll(/\s+/g, ' ') ?? '')
</script>

<template>
  <button
    v-bind="$attrs"
    class="code-field"
    :class="{ 'code-field--disabled': disabled }"
    :disabled="disabled"
    type="button"
    @click="open = true"
  >
    <span v-if="summary" class="code-field__code">{{ summary }}</span>
    <span v-else class="text-disabled">—</span>
  </button>

  <CodeDialog
    v-model="open"
    :code="code"
    :commit="commit"
    :doc="doc"
    :name="name"
    :object-path="objectPath"
    :title="title"
  />
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
