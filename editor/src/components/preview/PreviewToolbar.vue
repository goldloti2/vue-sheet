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
      <v-btn aria-label="電腦版" icon value="desktop">
        <v-icon :icon="mdiMonitor" />
        <v-tooltip activator="parent" location="bottom" text="電腦版" />
      </v-btn>

      <v-btn aria-label="手機版" icon value="mobile">
        <v-icon :icon="mdiCellphone" />
        <v-tooltip activator="parent" location="bottom" text="手機版" />
      </v-btn>
    </v-btn-toggle>

    <v-btn
      aria-label="重新整理"
      :disabled="status.state !== 'running'"
      icon
      @click="emit('reload')"
    >
      <v-icon :icon="mdiRefresh" />
      <v-tooltip activator="parent" location="bottom" text="重新整理" />
    </v-btn>

    <v-btn
      :aria-label="fullWindow ? '結束全視窗' : '全視窗'"
      icon
      @click="fullWindow = !fullWindow"
    >
      <v-icon :icon="fullWindow ? mdiFullscreenExit : mdiFullscreen" />
      <v-tooltip activator="parent" location="bottom" :text="fullWindow ? '結束全視窗' : '全視窗'" />
    </v-btn>

    <v-btn
      v-if="!fullWindow"
      aria-label="收合預覽"
      icon
      @click="emit('collapse')"
    >
      <v-icon :icon="mdiChevronRight" />
      <v-tooltip activator="parent" location="bottom" text="收合預覽" />
    </v-btn>
  </v-toolbar>
</template>

<style scoped>
.preview-toolbar__source {
  flex: 0 1 180px;
}
</style>
