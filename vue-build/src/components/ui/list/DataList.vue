<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { computed } from 'vue'
  import ListField from '@/components/ui/list/ListField.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useLongPress } from '@/composables/list/useLongPress'
  import { useRowLink } from '@/composables/navigation/useRowLink'

  // 泛型元件的 props 型別要寫在 defineProps 裡，抽成 interface 會讓型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to } = defineProps<{
    row: Row
    // 各欄位的位置與這一列的動作（defineView）
    view: RowView<Row>
    to?: string
    selectable?: boolean
    selectMode?: boolean
    selected?: boolean
  }>()

  const fields = computed(() => view(row))

  // 多選模式下隱藏動作列；沒有動作時不渲染，不佔高度
  const showActions = computed(() => !selectMode && fields.value.actions.some(action => action !== null))

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
  }>()

  const longPress = useLongPress(event => emit('longpress', event))
  const { href, navigate } = useRowLink(() => to)

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

    navigate(event)
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
  <div
    class="list-item"
    :class="{
      'list-item--selected': selectMode && selected,
      'list-item--no-select': selectable,
      'list-item--with-actions': showActions,
    }"
  >
    <!-- 有 to 時為 <a>（中鍵與 ctrl 點擊維持原生行為），否則為純顯示的一列。::after 覆蓋整列，動作列的空白處亦屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="list-item__link"
      :draggable="selectable ? 'false' : undefined"
      :href="href"
      v-bind="pointerHandlers"
      @click="onClick"
    >
      <ListField
        :aside="fields.aside"
        :image="fields.image"
        :select-mode="selectMode"
        :selected="selected"
        :subtitle="fields.subtitle"
        :summary="fields.summary"
        :title="fields.title"
      />
    </component>

    <!-- 按鈕與連結並列，不包在 <a> 內，點擊按鈕不會進入 detail，也不會觸發長按 -->
    <ViewActions v-if="showActions" :actions="fields.actions" class="list-item__actions" />
  </div>
</template>

<style scoped>
.list-item {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  /* 畫面外的列不排版也不繪製；72px 是還沒量到真實高度前的替代值 */
  content-visibility: auto;
  contain-intrinsic-size: auto 72px;
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 多出一列 32px 的按鈕與 4px 的間距 */
.list-item--with-actions {
  contain-intrinsic-size: auto 108px;
}

.list-item__link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.list-item__link::after {
  content: '';
  position: absolute;
  inset: 0;
}

/* 須疊於連結的 ::after 之上才能點擊；寬度僅包住按鈕，左側空白才會落在連結上 */
.list-item__actions {
  position: relative;
  z-index: 1;
  width: fit-content;
  margin: 4px 0 0 auto;
}

.list-item--no-select {
  -webkit-user-drag: none;
  user-select: none;
}

.list-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
