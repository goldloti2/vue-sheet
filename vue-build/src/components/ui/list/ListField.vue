<script lang="ts" setup>
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'

  defineProps<{
    title: string
    topRight?: string
    bottomLeft?: string
    bottomRight?: string
    // 轉好的 <img src>；有值就在最左邊放一張縮圖
    image?: string | null
    selectMode?: boolean
    selected?: boolean
  }>()
</script>

<template>
  <div class="list-item__layout">
    <img v-if="image" alt="" class="list-item__thumb" :src="image">

    <div class="list-item__rows">
      <div class="list-item__row">
        <div class="list-item__title-wrap">
          <v-icon
            v-if="selectMode"
            :color="selected ? 'primary' : undefined"
            :icon="selected ? mdiCheckCircle : mdiCircleOutline"
            size="20"
          />

          <span class="list-item__title text-title-medium font-weight-bold">{{ title }}</span>
        </div>

        <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ topRight }}</span>
      </div>

      <div class="list-item__row">
        <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--left">{{ bottomLeft }}</span>
        <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ bottomRight }}</span>
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

.list-item__field--left {
  text-align: left;
}

.list-item__field--right {
  text-align: right;
}
</style>
