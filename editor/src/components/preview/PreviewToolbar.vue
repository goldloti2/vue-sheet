<script lang="ts" setup>
  import type { PreviewSource, PreviewStatus } from '../../../shared/preview'
  import type { PreviewDevice } from './types'
  import { mdiCellphone, mdiChevronRight, mdiFullscreen, mdiFullscreenExit, mdiMonitor, mdiRefresh } from '@mdi/js'
  import { computed } from 'vue'
  import { PREVIEW_SOURCES } from '../../../shared/preview'

  const props = defineProps<{
    status: PreviewStatus
  }>()

  const emit = defineEmits<{
    start: [source: PreviewSource]
    reload: []
    collapse: []
  }>()

  const device = defineModel<PreviewDevice>('device', { required: true })
  const fullWindow = defineModel<boolean>('fullWindow', { required: true })

  const SOURCE_TITLES: Record<PreviewSource, string> = {
    mock: '本地測試',
    fake: '線上測試',
    sheet: '線上正式',
  }

  const sources = computed(() => PREVIEW_SOURCES.map(source => ({
    value: source,
    title: SOURCE_TITLES[source],
    subtitle: props.status.unavailable[source],
    disabled: props.status.unavailable[source] !== undefined,
  })))

  const source = computed({
    get: () => props.status.source,
    set: next => emit('start', next),
  })
</script>

<template>
  <v-toolbar class="preview-toolbar px-2" color="surface" density="compact">
    <v-select
      v-model="source"
      aria-label="資料來源"
      class="preview-toolbar__source"
      density="compact"
      :disabled="status.state === 'starting'"
      hide-details
      :item-props="true"
      :items="sources"
      variant="outlined"
    />

    <v-spacer />

    <v-btn-toggle
      v-model="device"
      color="primary"
      density="compact"
      mandatory
      variant="text"
    >
      <v-btn aria-label="電腦版" :icon="mdiMonitor" value="desktop" />
      <v-btn aria-label="手機版" :icon="mdiCellphone" value="mobile" />
    </v-btn-toggle>

    <v-btn
      aria-label="重新整理"
      :disabled="status.state !== 'running'"
      :icon="mdiRefresh"
      @click="emit('reload')"
    />

    <v-btn
      :aria-label="fullWindow ? '結束全視窗' : '全視窗'"
      :icon="fullWindow ? mdiFullscreenExit : mdiFullscreen"
      @click="fullWindow = !fullWindow"
    />

    <v-btn
      v-if="!fullWindow"
      aria-label="收合預覽"
      :icon="mdiChevronRight"
      @click="emit('collapse')"
    />
  </v-toolbar>
</template>

<style scoped>
.preview-toolbar__source {
  flex: 0 1 180px;
}
</style>
