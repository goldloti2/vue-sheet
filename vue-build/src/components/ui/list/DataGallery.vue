<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { mdiCheckCircle, mdiCircleOutline, mdiImageOutline } from '@mdi/js'
  import { computed } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to, pickable = false } = defineProps<{
    row: Row
    // 僅使用 image、title、subtitle 三個位置與這一列的動作（defineView）
    view: RowView<Row>
    to?: string
    selectable?: boolean
    selectMode?: boolean
    selected?: boolean
    // dashboard 面板的選取：是否為選取的那一列，以及點擊是否改為選取（由 ListPage 提供）
    current?: boolean
    // dashboard 面板的 mark：以另一種顏色標示的列
    marked?: boolean
    pickable?: boolean
  }>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
    pick: []
  }>()

  const fields = computed(() => view(row))

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
    class="gallery-item list-row list-card"
    :class="{
      'list-row--selected': selectMode && selected,
      'list-row--current': current,
      'list-row--marked': marked,
      'list-row--no-select': selectable,
    }"
  >
    <!-- 有 to 時為 <a>，否則為純顯示的一格。::after 覆蓋整格，⋮ 以外的區域皆屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="gallery-item__link list-row-link"
      :draggable="selectable ? 'false' : undefined"
      :href="href"
      v-bind="pointerHandlers"
      @click="onClick"
    >
      <!-- 多選模式下，勾選圖示疊於圖片左上角 -->
      <span v-if="selectMode" class="gallery-item__check">
        <v-icon
          :color="selected ? 'primary' : undefined"
          :icon="selected ? mdiCheckCircle : mdiCircleOutline"
          size="20"
        />
      </span>

      <img v-if="fields.image" alt="" class="gallery-item__image" :src="fields.image">

      <!-- 沒有圖片時以同樣大小的灰色方塊佔位，使格線對齊 -->
      <div v-else class="gallery-item__image gallery-item__placeholder">
        <v-icon :icon="mdiImageOutline" size="32" />
      </div>

      <div class="gallery-item__text">
        <!-- 未指定的位置不顯示，已指定但沒有值的位置保留一行 -->
        <div v-if="fields.title !== undefined" class="gallery-item__line text-title-small"><FormattedValue :value="fields.title" /></div>
        <div v-if="fields.subtitle !== undefined" class="gallery-item__line gallery-item__subtitle text-body-small text-medium-emphasis"><FormattedValue :value="fields.subtitle" /></div>
      </div>
    </component>

    <!-- 置於文字區右下，多選模式下隱藏 -->
    <ViewActions v-if="!selectMode" :actions="fields.actions" class="gallery-item__actions list-row-above-link" variant="menu" />
  </div>
</template>

<style scoped>
/* 整格的比例固定：上方為正方形圖片，下方剩餘的高度為文字區（見 docs/design/list.md 的「尺寸與樣式」） */
.gallery-item {
  box-sizing: border-box;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  /* 畫面外的格子不排版。高度由 aspect-ratio 依欄寬決定，無須替代值 */
  content-visibility: auto;
}

.gallery-item__link {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gallery-item__check {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}

/* 圖片上、左、右留白，仍為正方形 */
.gallery-item__image {
  display: block;
  flex: none;
  width: calc(100% - 16px);
  margin: 8px 8px 0;
  aspect-ratio: 1;
  object-fit: cover;
}

.gallery-item__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  background: rgb(var(--v-theme-surface-light));
}

/* 標題在上並佔滿寬度，副標緊接於標題下方 */
.gallery-item__text {
  min-width: 0;
  padding: 8px 12px;
}

/* 右側留出 ⋮ 的寬度：按鈕的寬與距右緣的距離，扣除文字區的內距，再留一點間隔 */
.gallery-item__subtitle {
  margin-right: 28px;
}

.gallery-item__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已指定但沒有值時，以零寬字元撐出一行的高度 */
.gallery-item__line:empty::before {
  content: '\200b';
}

/* 文字區右下。疊於連結之上由 list-row-above-link 負責 */
.gallery-item__actions {
  position: absolute;
  right: 2px;
  bottom: 2px;
}
</style>
