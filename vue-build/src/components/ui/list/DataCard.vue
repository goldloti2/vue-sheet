<script generic="Row extends object" lang="ts" setup>
  import type { CardView } from '@/schema/view'
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'
  import { computed } from 'vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to } = defineProps<{
    row: Row
    view: CardView<Row>
    to?: string
    selectable?: boolean
    selectMode?: boolean
    selected?: boolean
  }>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
  }>()

  const fields = computed(() => view(row))

  // 沒有內容的層整層隱藏
  const hasHeader = computed(() => {
    const { title, subtitle, image } = fields.value.header
    return Boolean(title || subtitle || image)
  })
  const hasBody = computed(() => {
    const { title, subtitle, summary } = fields.value.body
    return Boolean(title || subtitle || summary)
  })
  // 多選模式下隱藏動作列
  const hasActions = computed(() => !selectMode && fields.value.actions.slice(0, 4).some(action => action !== null))

  // 尚未量得實際高度前的替代值，依出現的層加總（各層高度見樣式）
  const estimatedHeight = computed(() => {
    const body = fields.value.body
    const bodyHeight = hasBody.value
      ? 24 + (body.title ? 24 : 0) + (body.subtitle ? 20 : 0) + (body.summary ? 24 : 0)
      : 0
    return (hasHeader.value ? 64 : 0) + (body.image ? 180 : 0) + bodyHeight + (hasActions.value ? 48 : 0)
  })

  const { href, onClick, pointerHandlers } = useRowClick({
    to: () => to,
    selectable: () => selectable,
    selectMode: () => selectMode,
    onLongpress: event => emit('longpress', event),
    onToggle: () => emit('toggle'),
  })
</script>

<template>
  <div
    class="card-item"
    :class="{
      'card-item--selected': selectMode && selected,
      'card-item--no-select': selectable,
    }"
    :style="{ containIntrinsicSize: `auto ${estimatedHeight}px` }"
  >
    <!-- 有 to 時為 <a>，否則為純顯示的一張卡片。::after 覆蓋整張卡片，動作按鈕以外的區域皆屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="card-item__link"
      :draggable="selectable ? 'false' : undefined"
      :href="href"
      v-bind="pointerHandlers"
      @click="onClick"
    >
      <!-- 多選模式下，勾選圖示疊於卡片左上角，不受各層有無內容影響 -->
      <span v-if="selectMode" class="card-item__check">
        <v-icon
          :color="selected ? 'primary' : undefined"
          :icon="selected ? mdiCheckCircle : mdiCircleOutline"
          size="20"
        />
      </span>

      <div v-if="hasHeader" class="card-item__header">
        <img v-if="fields.header.image" alt="" class="card-item__avatar" :src="fields.header.image">

        <div class="card-item__text">
          <div class="card-item__line text-title-medium font-weight-bold">{{ fields.header.title }}</div>
          <div class="card-item__line text-body-medium text-medium-emphasis">{{ fields.header.subtitle }}</div>
        </div>
      </div>

      <img v-if="fields.body.image" alt="" class="card-item__image" :src="fields.body.image">

      <div v-if="hasBody" class="card-item__body">
        <div v-if="fields.body.title" class="card-item__line text-title-medium font-weight-bold">{{ fields.body.title }}</div>
        <div v-if="fields.body.subtitle" class="card-item__line text-body-medium text-medium-emphasis">{{ fields.body.subtitle }}</div>
        <div v-if="fields.body.summary" class="card-item__summary text-body-medium">{{ fields.body.summary }}</div>
      </div>
    </component>

    <!-- 按鈕與連結並列，不包在 <a> 內，點擊按鈕不會進入 detail -->
    <ViewActions v-if="hasActions" :actions="fields.actions" class="card-item__actions" variant="slots" />
  </div>
</template>

<style scoped>
.card-item {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: var(--list-card-gap);
  overflow: hidden;
  /* 畫面外的卡片不排版也不繪製；替代高度由 estimatedHeight 依出現的層算出 */
  content-visibility: auto;
  background: rgb(var(--v-theme-surface));
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  box-shadow: var(--list-card-shadow);
}

.card-item__link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.card-item__link::after {
  content: '';
  position: absolute;
  inset: 0;
}

.card-item__check {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}

/* 第 1 層：12px 上下內距 + 40px 頭像 = 64px */
.card-item__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.card-item__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.card-item__text {
  min-width: 0;
}

/* 第 2 層：固定 16:9、裁切填滿，載入前即確定高度 */
.card-item__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

/* 第 3 層 */
.card-item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
}

.card-item__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-item__summary {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* 第 4 層：須疊於連結的 ::after 之上才能點擊；8px 上下內距 + 32px 按鈕 = 48px。
   整列寬度皆為動作列，僅按鈕接收點擊，空白處仍落在連結上 */
.card-item__actions {
  position: relative;
  z-index: 1;
  padding: 8px;
  pointer-events: none;
}

.card-item__actions :deep(button) {
  pointer-events: auto;
}

.card-item--no-select {
  -webkit-user-drag: none;
  user-select: none;
}

/* 主色淡底疊於卡片的底色之上 */
.card-item--selected {
  background: linear-gradient(rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.08)), rgb(var(--v-theme-surface));
}
</style>
