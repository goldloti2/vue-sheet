<script lang="ts" setup>
  import type { PreviewSource } from '../../../shared/preview'
  import type { PreviewDevice } from './types'
  import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
  import { useEventListener } from '@/composables/useEventListener'
  import { usePreviewStore } from '@/stores/preview'
  import PreviewFrame from './PreviewFrame.vue'
  import PreviewToolbar from './PreviewToolbar.vue'

  const store = usePreviewStore()
  const device = shallowRef<PreviewDevice>('mobile')
  const fullWindow = shallowRef(false)

  // 電腦版只以全視窗顯示：切換至電腦版即展開，結束全視窗即回到手機版
  watch(device, next => {
    if (next === 'desktop') {
      fullWindow.value = true
    }
  })
  watch(fullWindow, next => {
    if (!next) {
      device.value = 'mobile'
    }
  })
  const startError = shallowRef<string | null>(null)
  const frame = useTemplateRef<InstanceType<typeof PreviewFrame>>('frame')

  // 每次啟動完成即重建 iframe。重新啟動後網址可能不變
  const startCount = shallowRef(0)
  watch(() => store.status?.state, (state, previous) => {
    if (state === 'running' && previous !== 'running') {
      startCount.value++
    }
  })

  const status = computed(() => store.status)

  // 重新整理與重新啟動預覽時清空控制台
  function reload (): void {
    store.clearEntries()
    frame.value?.reload()
  }

  async function start (source: PreviewSource): Promise<void> {
    startError.value = null
    store.clearEntries()
    try {
      await store.start(source)
    } catch (error) {
      startError.value = (error as Error).message
    }
  }

  useEventListener(window, 'keydown', event => {
    if (fullWindow.value && event.key === 'Escape') {
      fullWindow.value = false
    }
  })

  onMounted(() => {
    void store.load()
  })
</script>

<template>
  <section class="preview-pane" :class="{ 'preview-pane--full': fullWindow }">
    <template v-if="status">
      <PreviewToolbar
        v-model:device="device"
        v-model:full-window="fullWindow"
        :status="status"
        @reload="reload"
        @start="start"
      />

      <v-alert
        v-if="status.source === 'sheet'"
        class="preview-pane__notice"
        density="compact"
        text="預覽中的修改會寫入正式的 Sheet。"
        type="warning"
        variant="tonal"
      />

      <v-alert
        v-if="startError"
        class="preview-pane__notice"
        closable
        density="compact"
        :text="startError"
        type="error"
        variant="tonal"
        @click:close="startError = null"
      />

      <PreviewFrame
        v-if="status.state === 'running' && status.url"
        :key="startCount"
        ref="frame"
        class="preview-pane__body"
        :device="device"
        :url="status.url"
        @console="store.addEntry"
        @vite-error="store.setViteProblem"
      />

      <div v-else-if="status.state === 'starting'" class="preview-pane__body preview-pane__message text-medium-emphasis">
        <v-progress-circular indeterminate size="24" width="2" />
        預覽啟動中
      </div>

      <div v-else class="preview-pane__body preview-pane__message">
        <div>預覽無法啟動。</div>
        <pre class="preview-pane__error text-medium-emphasis">{{ status.error }}</pre>
        <v-btn text="重試" variant="tonal" @click="start(status.source)" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
}

.preview-pane--full {
  position: fixed;
  inset: 0;
  z-index: 1500;
}

.preview-pane__notice {
  flex: none;
  border-radius: 0;
}

.preview-pane__body {
  flex: 1;
  min-height: 0;
}

.preview-pane__message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
}

.preview-pane__error {
  max-width: 100%;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
}
</style>
