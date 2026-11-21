<script lang="ts" setup>
  import type { AppConfigEdit, AppConfigModel } from '../../../shared/appConfig'
  import { computed } from 'vue'
  import CommitTextField from '../schema/CommitTextField.vue'
  import SettingFallback from './SettingFallback.vue'

  const props = defineProps<{
    model: AppConfigModel
  }>()

  const emit = defineEmits<{
    edit: [edits: AppConfigEdit[]]
  }>()

  const FILE = 'app.ts'

  // 選項的名稱。編輯器不認得的值顯示原值
  const LAYOUT_TITLES: Record<string, string> = { side: '左右並排', stacked: '名稱在上' }

  const layoutItems = computed(() => {
    const current = props.model.detailFieldLayout?.kind === 'value' ? [props.model.detailFieldLayout.value] : []
    const values = props.model.options.detailFieldLayout ?? current
    return values.map(value => ({ title: LAYOUT_TITLES[value] ?? value, value }))
  })

  const delayText = computed(() => props.model.autoPushDelay?.kind === 'value' && props.model.autoPushDelay.value !== null
    ? String(props.model.autoPushDelay.value)
    : '')

  // 不可空白
  async function commitAppName (text: string): Promise<boolean> {
    const value = text.trim()
    if (value === '') {
      return false
    }
    emit('edit', [{ name: 'appName', value }])
    return true
  }

  // 空白為不啟用，否則為大於 0 的秒數
  async function commitDelay (text: string): Promise<boolean> {
    if (text.trim() === '') {
      emit('edit', [{ name: 'autoPushDelay', value: null }])
      return true
    }
    const value = Number(text)
    if (!Number.isFinite(value) || value <= 0) {
      return false
    }
    emit('edit', [{ name: 'autoPushDelay', value }])
    return true
  }

  function setLayout (value: string): void {
    emit('edit', [{ name: 'detailFieldLayout', value }])
  }
</script>

<template>
  <div class="settings-grid">
    <span class="text-body-2">App 名稱</span>

    <CommitTextField
      v-if="model.appName?.kind === 'value'"
      :commit="commitAppName"
      :model-value="model.appName.value"
    />

    <SettingFallback v-else :file="FILE" name="appName" :value="model.appName" />

    <span class="text-body-2">詳細頁欄位表示</span>

    <v-select
      v-if="model.detailFieldLayout?.kind === 'value'"
      density="compact"
      hide-details
      :items="layoutItems"
      :model-value="model.detailFieldLayout.value"
      variant="outlined"
      @update:model-value="setLayout"
    />

    <SettingFallback v-else :file="FILE" name="detailFieldLayout" :value="model.detailFieldLayout" />

    <span class="text-body-2">計時推送（秒）</span>

    <CommitTextField
      v-if="model.autoPushDelay?.kind === 'value'"
      :commit="commitDelay"
      :model-value="delayText"
      placeholder="不啟用"
      type="number"
    />

    <SettingFallback v-else :file="FILE" name="autoPushDelay" :value="model.autoPushDelay" />
  </div>
</template>
