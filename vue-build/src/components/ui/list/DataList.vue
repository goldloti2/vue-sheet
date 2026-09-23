<script lang="ts" setup>
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
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

  const { selectable = false, selectMode } = defineProps<DataListProps>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
  }>()

  const longPress = useLongPress(event => emit('longpress', event))

  function onClick (event: MouseEvent, navigate?: (event?: MouseEvent) => Promise<unknown>) {
    longPress.onClick(event)
    if (event.defaultPrevented) {
      return
    }

    if (selectMode) {
      event.preventDefault()
      emit('toggle')
      return
    }

    navigate?.(event)
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
  <RouterLink v-if="to" v-slot="{ href, navigate }" custom :to="to">
    <a
      class="list-item"
      :class="{ 'list-item--selected': selectMode && selected, 'list-item--no-select': selectable }"
      :draggable="selectable ? 'false' : undefined"
      :href="href"
      v-bind="pointerHandlers"
      @click="onClick($event, navigate)"
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
    </a>
  </RouterLink>

  <div
    v-else
    class="list-item"
    :class="{ 'list-item--selected': selectMode && selected, 'list-item--no-select': selectable }"
    v-bind="pointerHandlers"
    @click="onClick($event)"
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
  </div>
</template>

<style scoped>
.list-item {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
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
