<script lang="ts" setup>
  import type { DisplayValue } from '@/schema/format'
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'
  import { computed } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'

  // 位置名稱同 view：title 左上、subtitle 右上、summary 左下、aside 右下。undefined 的位置不顯示
  const props = defineProps<{
    title?: DisplayValue
    subtitle?: DisplayValue
    summary?: DisplayValue
    aside?: DisplayValue
    // 已轉換的 <img src>。null 表示已指定但沒有圖片，保留同大小的空白
    image?: string | null
    selectMode?: boolean
    selected?: boolean
  }>()

  const hasTopRow = computed(() => props.title !== undefined || props.subtitle !== undefined || props.selectMode)
  const hasBottomRow = computed(() => props.summary !== undefined || props.aside !== undefined)

  // 一側的兩個位置皆未指定時，另一側延伸至整行。依 view 而定，各列一致
  const span = computed(() => {
    if (props.subtitle === undefined && props.aside === undefined) {
      return 'left'
    }
    return props.title === undefined && props.summary === undefined ? 'right' : null
  })
</script>

<template>
  <div class="list-item__layout">
    <img v-if="image" alt="" class="list-item__thumb" :src="image">
    <span v-else-if="image === null" class="list-item__thumb" />

    <div class="list-item__rows" :class="span && `list-item__rows--${span}`">
      <div v-if="hasTopRow" class="list-item__row">
        <div v-if="title !== undefined || selectMode" class="list-item__title-wrap">
          <v-icon
            v-if="selectMode"
            :color="selected ? 'primary' : undefined"
            :icon="selected ? mdiCheckCircle : mdiCircleOutline"
            size="20"
          />

          <span v-if="title !== undefined" class="list-item__title text-title-medium font-weight-bold"><FormattedValue :value="title" /></span>
        </div>

        <span v-if="subtitle !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--right"><FormattedValue :value="subtitle" /></span>
      </div>

      <div v-if="hasBottomRow" class="list-item__row">
        <span v-if="summary !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--left"><FormattedValue :value="summary" /></span>
        <span v-if="aside !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--right"><FormattedValue :value="aside" /></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-item__layout {
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-item__thumb {
  flex: none;
  width: 48px;
  height: 48px;
  /* 等比縮放至框內，不裁切，長方形的圖兩側留白 */
  object-fit: contain;
  border-radius: 4px;
}

.list-item__rows {
  flex: 1;
  min-width: 0;
}

.list-item__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
}

.list-item__row + .list-item__row {
  margin-top: 4px;
}

.list-item__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.list-item__title {
  text-align: left;
}

/* 左右固定在各自的欄，另一側未指定時也不移位 */
.list-item__field--left {
  grid-column: 1;
  text-align: left;
}

.list-item__field--right {
  grid-column: 2;
  text-align: right;
}

/* 右側皆未指定：左側佔滿整行 */
.list-item__rows--left .list-item__row {
  grid-template-columns: 1fr;
}

/* 左側皆未指定：右側佔滿整行，靠右。第一欄只在多選時放勾選圖示 */
.list-item__rows--right .list-item__row {
  grid-template-columns: auto 1fr;
}

/* 已指定但沒有值時，以零寬字元撐出一行的高度 */
.list-item__title:empty::before,
.list-item__field:empty::before {
  content: '\200b';
}

/* dashboard 中 3 格以下的窄面板：只留標題與副標，上下排列並靠左（門檻見 docs/components/panel/DashboardPanel.md） */
@container dashboard-panel (width < 200px) {
  .list-item__rows .list-item__row {
    grid-template-columns: 1fr;
  }

  .list-item__row .list-item__field--right {
    grid-column: 1;
    text-align: left;
  }

  .list-item__row + .list-item__row {
    display: none;
  }
}
</style>
