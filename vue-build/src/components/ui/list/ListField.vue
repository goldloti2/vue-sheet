<script lang="ts" setup>
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'
  import { computed } from 'vue'

  // 位置的名稱跟 view 一樣（schema/view.ts）：title 左上、subtitle 右上、summary 左下、aside 右下。
  // 沒指定的位置為 undefined，不畫；指定了但沒有值的保留位置
  const props = defineProps<{
    title?: string
    subtitle?: string
    summary?: string
    aside?: string
    // 轉好的 <img src>；null 為指定了但沒有圖，留一塊同大小的空白
    image?: string | null
    selectMode?: boolean
    selected?: boolean
  }>()

  const hasTopRow = computed(() => props.title !== undefined || props.subtitle !== undefined || props.selectMode)
  const hasBottomRow = computed(() => props.summary !== undefined || props.aside !== undefined)
</script>

<template>
  <div class="list-item__layout">
    <img v-if="image" alt="" class="list-item__thumb" :src="image">
    <span v-else-if="image === null" class="list-item__thumb" />

    <div class="list-item__rows">
      <div v-if="hasTopRow" class="list-item__row">
        <div class="list-item__title-wrap">
          <v-icon
            v-if="selectMode"
            :color="selected ? 'primary' : undefined"
            :icon="selected ? mdiCheckCircle : mdiCircleOutline"
            size="20"
          />

          <span v-if="title !== undefined" class="list-item__title text-title-medium font-weight-bold">{{ title }}</span>
        </div>

        <span v-if="subtitle !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ subtitle }}</span>
      </div>

      <div v-if="hasBottomRow" class="list-item__row">
        <span v-if="summary !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--left">{{ summary }}</span>
        <span v-if="aside !== undefined" class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ aside }}</span>
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
  /* 等比縮到框內、不裁切，所以長方形的圖兩側會留白 */
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

/* 左右固定在各自的欄，另一側沒指定時也不會移位 */
.list-item__field--left {
  grid-column: 1;
  text-align: left;
}

.list-item__field--right {
  grid-column: 2;
  text-align: right;
}

/* 指定了但沒有值：以零寬字元撐出一行的高度 */
.list-item__title:empty::before,
.list-item__field:empty::before {
  content: '\200b';
}

/* dashboard 中 3 格以下的窄面板：只留標題與副標，上下排列並靠左（門檻見 docs/components/panel/DashboardPanel.md） */
@container dashboard-panel (width < 200px) {
  .list-item__row {
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
