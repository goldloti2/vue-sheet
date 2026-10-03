<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import ListField from '@/components/ui/list/ListField.vue'
  import { useLongPress } from '@/composables/list/useLongPress'

  interface DataListProps {
    title: string
    topRight?: string
    bottomLeft?: string
    bottomRight?: string
    // 轉好的 <img src>（用 schema/image.ts 的 imageSrc）；有給才顯示縮圖
    image?: string | null
    to?: string
    selectable?: boolean
    selectMode?: boolean
    selected?: boolean
  }

  const { selectable = false, selectMode, to } = defineProps<DataListProps>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
  }>()

  const longPress = useLongPress(event => emit('longpress', event))
  const router = useRouter()

  // 連結是自己組 href 的 <a>，不是 RouterLink（理由見 docs/components/DataList.md）
  const href = computed(() => to ? router.options.history.base + to : undefined)

  function onClick (event: MouseEvent) {
    longPress.onClick(event)
    if (event.defaultPrevented) {
      return
    }

    if (selectMode) {
      event.preventDefault()
      emit('toggle')
      return
    }

    // 帶修飾鍵或不是左鍵時交給瀏覽器，開新分頁／新視窗才會照原生行為
    if (!to || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    void router.push(to)
  }

  // 沒開多選功能就不要綁長按用的 pointer 監聽，普通文字選取/拖曳行為維持原生
  const pointerHandlers = computed(() => selectable
    ? {
      onPointercancel: longPress.onPointercancel,
      onPointerdown: longPress.onPointerdown,
      onPointerleave: longPress.onPointerleave,
      onPointerup: longPress.onPointerup,
    }
    : {})
</script>

<template>
  <!-- 有 to 就是 <a>（中鍵與 ctrl 點擊照原生行為），沒有就是純顯示的一列 -->
  <component
    :is="to ? 'a' : 'div'"
    class="list-item"
    :class="{ 'list-item--selected': selectMode && selected, 'list-item--no-select': selectable }"
    :draggable="selectable ? 'false' : undefined"
    :href="href"
    v-bind="pointerHandlers"
    @click="onClick"
  >
    <ListField
      :bottom-left="bottomLeft"
      :bottom-right="bottomRight"
      :image="image"
      :select-mode="selectMode"
      :selected="selected"
      :title="title"
      :top-right="topRight"
    />
  </component>
</template>

<style scoped>
.list-item {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  /* 畫面外的列不排版也不繪製；72px 是還沒量到真實高度前的替代值 */
  content-visibility: auto;
  contain-intrinsic-size: auto 72px;
  color: inherit;
  text-decoration: none;
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.list-item--no-select {
  -webkit-user-drag: none;
  user-select: none;
}

.list-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
