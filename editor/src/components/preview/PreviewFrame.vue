<script lang="ts" setup>
  import type { ConsoleEntry, PreviewCommand, PreviewPageMessage } from '../../../shared/preview'
  import type { PreviewDevice } from './types'
  import { computed, useTemplateRef } from 'vue'
  import { useElementSize } from '@/composables/useElementSize'
  import { useEventListener } from '@/composables/useEventListener'
  import { PREVIEW_MESSAGE_TAG } from '../../../shared/preview'
  import { DESKTOP_WIDTH, MOBILE_HEIGHT, MOBILE_WIDTH } from './types'

  const props = defineProps<{
    url: string
    device: PreviewDevice
  }>()

  const emit = defineEmits<{
    console: [entry: ConsoleEntry]
  }>()

  const container = useTemplateRef<HTMLElement>('container')
  const frame = useTemplateRef<HTMLIFrameElement>('frame')
  const { width, height } = useElementSize(container)

  const frameStyle = computed(() => {
    if (width.value === 0 || height.value === 0) {
      return { visibility: 'hidden' as const }
    }
    if (props.device === 'desktop') {
      const pageWidth = Math.max(DESKTOP_WIDTH, width.value)
      const scale = width.value / pageWidth
      return { width: `${pageWidth}px`, height: `${height.value / scale}px`, left: '0', top: '0', transform: `scale(${scale})` }
    }
    const scale = Math.min(1, width.value / MOBILE_WIDTH, height.value / MOBILE_HEIGHT)
    return {
      width: `${MOBILE_WIDTH}px`,
      height: `${MOBILE_HEIGHT}px`,
      left: `${(width.value - MOBILE_WIDTH * scale) / 2}px`,
      top: `${(height.value - MOBILE_HEIGHT * scale) / 2}px`,
      transform: `scale(${scale})`,
    }
  })

  const origin = computed(() => new URL(props.url).origin)

  useEventListener(window, 'message', (event: MessageEvent<PreviewPageMessage | undefined>) => {
    if (event.source !== frame.value?.contentWindow || event.origin !== origin.value || event.data?.tag !== PREVIEW_MESSAGE_TAG) {
      return
    }
    emit('console', { origin: 'page', level: event.data.level, text: event.data.text, time: Date.now() })
  })

  // 預覽頁面重新載入目前的網址
  function reload (): void {
    const command: PreviewCommand = { tag: PREVIEW_MESSAGE_TAG, kind: 'reload' }
    frame.value?.contentWindow?.postMessage(command, origin.value)
  }

  defineExpose({ reload })
</script>

<template>
  <div ref="container" class="preview-frame" :class="`preview-frame--${device}`">
    <iframe
      ref="frame"
      class="preview-frame__page"
      :src="url"
      :style="frameStyle"
      title="預覽"
    />
  </div>
</template>

<style scoped>
.preview-frame {
  position: relative;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-variant));
}

.preview-frame__page {
  position: absolute;
  border: 0;
  transform-origin: top left;
  background: rgb(var(--v-theme-surface));
}

.preview-frame--mobile .preview-frame__page {
  box-shadow: 0 0 0 thin rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
