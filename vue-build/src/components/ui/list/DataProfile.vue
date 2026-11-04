<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'
  import { computed } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowClick } from '@/composables/list/useRowClick'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, selectable = false, selectMode, to, pickable = false } = defineProps<{
    row: Row
    // 僅使用 title、subtitle、image 三個位置與這一列的動作（defineView）
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
    class="profile-item list-row list-card"
    :class="{
      'list-row--selected': selectMode && selected,
      'list-row--current': current,
      'list-row--marked': marked,
      'list-row--no-select': selectable,
    }"
  >
    <!-- 有 to 時為 <a>，否則為純顯示的一張卡片。::after 覆蓋整張卡片，⋮ 以外的區域皆屬於連結 -->
    <component
      :is="to ? 'a' : 'div'"
      class="profile-item__link list-row-link"
      :draggable="selectable ? 'false' : undefined"
      :href="href"
      v-bind="pointerHandlers"
      @click="onClick"
    >
      <!-- 多選模式下，勾選圖示置於頭像左側 -->
      <v-icon
        v-if="selectMode"
        :color="selected ? 'primary' : undefined"
        :icon="selected ? mdiCheckCircle : mdiCircleOutline"
        size="20"
      />

      <!-- 未指定的位置不顯示，已指定但沒有值的位置保留（頭像保留同大小的空白） -->
      <img v-if="fields.image" alt="" class="profile-item__avatar" :src="fields.image">
      <span v-else-if="fields.image === null" class="profile-item__avatar" />

      <div class="profile-item__text">
        <div v-if="fields.title !== undefined" class="profile-item__title text-title-medium font-weight-bold"><FormattedValue :value="fields.title" /></div>
        <div v-if="fields.subtitle !== undefined" class="profile-item__subtitle text-body-medium text-medium-emphasis"><FormattedValue :value="fields.subtitle" /></div>
      </div>
    </component>

    <!-- 多選模式下隱藏 ⋮ -->
    <ViewActions v-if="!selectMode" :actions="fields.actions" class="list-row-above-link" variant="menu" />
  </div>
</template>

<style scoped>
.profile-item {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 8px 12px 16px;
  margin-bottom: var(--list-card-gap);
  /* 畫面外的卡片不排版。替代值為卡片的高度（見 docs/design/list.md 的「尺寸與樣式」） */
  content-visibility: auto;
  contain-intrinsic-size: auto 68px;
  border-radius: var(--list-card-radius);
}

.profile-item__link {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.profile-item__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.profile-item__text {
  min-width: 0;
}

.profile-item__title,
.profile-item__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已指定但沒有值時，以零寬字元撐出一行的高度 */
.profile-item__title:empty::before,
.profile-item__subtitle:empty::before {
  content: '\200b';
}
</style>
