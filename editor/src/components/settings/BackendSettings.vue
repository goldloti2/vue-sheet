<script lang="ts" setup>
  import type { ConfigEdit, ConfigModel, ConfigValue } from '../../../shared/configGs'
  import CommitTextField from '../schema/CommitTextField.vue'
  import SettingFallback from './SettingFallback.vue'

  defineProps<{
    model: ConfigModel
  }>()

  const emit = defineEmits<{
    edit: [edits: ConfigEdit[]]
  }>()

  const FILE = 'Config.gs'

  function numberText (value: ConfigValue<number>): string {
    return value?.kind === 'value' ? String(value.value) : ''
  }

  // 整數，最小為 1
  async function commitHeaderRow (text: string): Promise<boolean> {
    const value = Number(text)
    if (!Number.isInteger(value) || value < 1) {
      return false
    }
    emit('edit', [{ kind: 'setHeaderRow', value }])
    return true
  }

  // 大於 0 的秒數
  async function commitLockTimeout (text: string): Promise<boolean> {
    const seconds = Number(text)
    if (text.trim() === '' || !Number.isFinite(seconds) || seconds <= 0) {
      return false
    }
    emit('edit', [{ kind: 'setLockTimeout', seconds }])
    return true
  }
</script>

<template>
  <div class="settings-grid">
    <span class="text-body-2">表頭列號</span>

    <CommitTextField
      v-if="model.headerRow?.kind === 'value'"
      :commit="commitHeaderRow"
      :model-value="numberText(model.headerRow)"
      type="number"
    />

    <SettingFallback v-else :file="FILE" name="HEADER_ROW" :value="model.headerRow" />

    <span class="text-body-2">推送排隊上限（秒）</span>

    <CommitTextField
      v-if="model.lockTimeout?.kind === 'value'"
      :commit="commitLockTimeout"
      :model-value="numberText(model.lockTimeout)"
      type="number"
    />

    <SettingFallback v-else :file="FILE" name="LOCK_TIMEOUT_MS" :value="model.lockTimeout" />
  </div>
</template>
