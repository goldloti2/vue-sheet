<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { mdiCheckCircle, mdiCircleOutline, mdiImageOutline } from '@mdi/js'
  import { computed } from 'vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to } = defineProps<{
    row: Row
    // 僅使用 image、title、subtitle 三個位置與這一列的動作（defineView）
    view: RowView<Row>
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
    class="gallery-item list-row list-card"
    :class="{
      'list-row--selected': selectMode && selected,
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

      <!-- 沒有圖片時以同樣大小的灰色方塊佔位，格線才會對齊 -->
      <div v-else class="gallery-item__image gallery-item__placeholder">
        <v-icon :icon="mdiImageOutline" size="32" />
      </div>

      <div class="gallery-item__text">
        <div class="gallery-item__line text-title-small font-weight-bold">{{ fields.title }}</div>
        <div v-if="fields.subtitle" class="gallery-item__line gallery-item__subtitle text-body-small text-medium-emphasis">{{ fields.subtitle }}</div>
      </div>
    </component>

    <!-- 置於文字區右下；多選模式下隱藏 -->
    <ViewActions v-if="!selectMode" :actions="fields.actions" class="gallery-item__actions list-row-above-link" variant="menu" />
  </div>
</template>

<style scoped>
/* 整格為 3:4：上方為寬度撐滿的正方形圖片，下方剩餘的 1/4 為文字區 */
.gallery-item {
  box-sizing: border-box;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  /* 畫面外的格子不排版也不繪製；高度由 aspect-ratio 依欄寬決定，不需替代值 */
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

/* 圖片上、左、右各留白 8px，仍為正方形 */
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

/* 標題在上、佔滿寬度；副標緊接於標題下方 */
.gallery-item__text {
  min-width: 0;
  padding: 8px 12px;
}

/* 右側留出 ⋮ 的寬度（按鈕 32px + 距右緣 4px，扣除文字區的內距 12px，再留 4px 間隔） */
.gallery-item__subtitle {
  margin-right: 28px;
}

.gallery-item__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 文字區右下，距右緣與底緣各 2px；疊於連結之上由 list-row-above-link 負責 */
.gallery-item__actions {
  position: absolute;
  right: 2px;
  bottom: 2px;
}
</style>
