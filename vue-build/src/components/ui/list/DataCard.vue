<script generic="Row extends object" lang="ts" setup>
  import type { CardView } from '@/schema/view'
  import { mdiCheckCircle, mdiCircleOutline, mdiImageOutline } from '@mdi/js'
  import { computed } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to, pickable = false } = defineProps<{
    row: Row
    view: CardView<Row>
    to?: string
    selectable?: boolean
    selectMode?: boolean
    selected?: boolean
    // dashboard 的互動：是否為選取的那一列，以及點擊是否改為選取（由 ListPage 提供）
    current?: boolean
    pickable?: boolean
  }>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
    pick: []
  }>()

  const fields = computed(() => view(row))

  // 未指定任何位置的層整層隱藏，已指定但沒有值的位置保留
  const hasHeader = computed(() => {
    const { title, subtitle, image } = fields.value.header
    return title !== undefined || subtitle !== undefined || image !== undefined
  })
  const hasBody = computed(() => {
    const { title, subtitle, summary } = fields.value.body
    return title !== undefined || subtitle !== undefined || summary !== undefined
  })
  // 多選模式下隱藏動作列
  const hasActions = computed(() => !selectMode && fields.value.actions.slice(0, 4).some(action => action !== null))

  // 量得實際高度之前的替代值，依出現的層加總（各層的高度見樣式）
  const estimateStyle = computed(() => {
    const body = fields.value.body
    const bodyHeight = hasBody.value
      ? 24 + (body.title === undefined ? 0 : 24) + (body.subtitle === undefined ? 0 : 20) + (body.summary === undefined ? 0 : 24)
      : 0
    return {
      '--card-fixed-height': `${(hasHeader.value ? 64 : 0) + (hasActions.value ? 48 : 0)}px`,
      '--card-body-height': `${bodyHeight}px`,
      '--card-image-ratio': body.image === undefined ? '0' : '1',
    }
  })

  const { href, onClick, pointerHandlers } = useRowClick({
    to: () => to,
    selectable: () => selectable,
    selectMode: () => selectMode,
    onLongpress: event => emit('longpress', event),
    onToggle: () => emit('toggle'),
    pickable: () => pickable,
    onPick: () => emit('pick'),
  })
</script>

<template>
  <div
    class="card-item list-row list-card"
    :class="{
      'list-row--selected': selectMode && selected,
      'list-row--current': current,
      'list-row--no-select': selectable,
    }"
    :style="estimateStyle"
  >
    <!-- 有 to 時為 <a>，否則為純顯示的一張卡片。::after 覆蓋整張卡片，動作按鈕以外的區域皆屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="card-item__link list-row-link"
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

      <!-- 未指定的位置不顯示，已指定但沒有值的位置保留（頭像保留同大小的空白） -->
      <div v-if="hasHeader" class="card-item__header">
        <img v-if="fields.header.image" alt="" class="card-item__avatar" :src="fields.header.image">
        <span v-else-if="fields.header.image === null" class="card-item__avatar" />

        <div class="card-item__text">
          <div v-if="fields.header.title !== undefined" class="card-item__line text-title-medium font-weight-bold"><FormattedValue :value="fields.header.title" /></div>
          <div v-if="fields.header.subtitle !== undefined" class="card-item__line text-body-medium text-medium-emphasis"><FormattedValue :value="fields.header.subtitle" /></div>
        </div>
      </div>

      <!-- 已指定大圖但沒有圖片時，以同樣大小的灰色方塊佔位 -->
      <img v-if="fields.body.image" alt="" class="card-item__image" :src="fields.body.image">

      <div v-else-if="fields.body.image === null" class="card-item__image card-item__placeholder">
        <v-icon :icon="mdiImageOutline" size="48" />
      </div>

      <div v-if="hasBody" class="card-item__body">
        <div v-if="fields.body.title !== undefined" class="card-item__line text-title-medium font-weight-bold"><FormattedValue :value="fields.body.title" /></div>
        <div v-if="fields.body.subtitle !== undefined" class="card-item__line text-body-medium text-medium-emphasis"><FormattedValue :value="fields.body.subtitle" /></div>
        <div v-if="fields.body.summary !== undefined" class="card-item__summary text-body-medium"><FormattedValue :value="fields.body.summary" /></div>
      </div>
    </component>

    <!-- 按鈕與連結並列，不包在 <a> 中，點擊按鈕不進入詳細頁 -->
    <ViewActions v-if="hasActions" :actions="fields.actions" class="card-item__actions list-row-above-link" variant="slots" />
  </div>
</template>

<style scoped>
.card-item {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: var(--list-card-gap);
  overflow: hidden;
  /* 替代高度為各層加總（100cqw 即卡片寬）。第 3 層以 --card-body-shown 覆寫，以免行內樣式蓋過 container query */
  content-visibility: auto;
  contain-intrinsic-size: auto calc(var(--card-fixed-height) + var(--card-body-shown, var(--card-body-height)) + var(--card-image-ratio) * 100cqw * 9 / 16);
  border-radius: var(--list-card-radius);
}

.card-item__link {
  display: block;
}

.card-item__check {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}

/* 第 1 層：上下內距加頭像（見 docs/design/list.md 的「尺寸與樣式」） */
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

/* 第 2 層：比例固定、裁切填滿，載入前即確定高度 */
.card-item__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.card-item__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  background: rgb(var(--v-theme-surface-light));
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

/* 已指定但沒有值時，以零寬字元撐出一行的高度 */
.card-item__line:empty::before,
.card-item__summary:empty::before {
  content: '\200b';
}

/* dashboard 的窄面板：省略第 3 層（門檻見 docs/design/dashboard.md） */
@container dashboard-panel (width < 200px) {
  .card-item {
    --card-body-shown: 0px;
  }

  .card-item__body {
    display: none;
  }
}

/* 第 4 層：上下內距加按鈕。只有按鈕接收點擊，空白處仍落在連結上 */
.card-item__actions {
  padding: 8px;
  pointer-events: none;
}

.card-item__actions :deep(button) {
  pointer-events: auto;
}
</style>
