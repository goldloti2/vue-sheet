<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { computed } from 'vue'
  import ListField from '@/components/ui/list/ListField.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to, pickable = false } = defineProps<{
    row: Row
    // 各欄位的位置與這一列的動作（defineView）
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

  const fields = computed(() => view(row))

  // 多選模式下隱藏動作列。沒有動作時不顯示，不佔高度
  const showActions = computed(() => !selectMode && fields.value.actions.some(action => action !== null))

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
    toggle: []
    pick: []
  }>()

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
    class="list-item list-row"
    :class="{
      'list-row--selected': selectMode && selected,
      'list-row--current': current,
      'list-row--marked': marked,
      'list-row--no-select': selectable,
      'list-item--with-actions': showActions,
    }"
  >
    <!-- 有 to 時為 <a>（中鍵與 ctrl 點擊維持原生行為），否則為純顯示的一列。::after 覆蓋整列，動作列的空白處亦屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="list-item__link list-row-link"
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

    <!-- 按鈕與連結並列，不包在 <a> 中，點擊按鈕不進入詳細頁，也不觸發長按 -->
    <ViewActions v-if="showActions" :actions="fields.actions" class="list-item__actions list-row-above-link" />
  </div>
</template>

<style scoped>
.list-item {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  /* 畫面外的列不排版。替代值為一列的高度（見 docs/design/list.md 的「尺寸與樣式」） */
  content-visibility: auto;
  contain-intrinsic-size: auto 72px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 另加動作列的高度 */
.list-item--with-actions {
  contain-intrinsic-size: auto 108px;
}

.list-item__link {
  display: block;
}

/* 寬度只包住按鈕，使左側的空白落在連結上 */
.list-item__actions {
  width: fit-content;
  margin: 4px 0 0 auto;
}
</style>
