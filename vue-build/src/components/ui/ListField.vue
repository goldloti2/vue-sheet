<script lang="ts" setup>
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js'

  defineProps<{
    title: string
    topRight?: string
    bottomLeft?: string
    bottomRight?: string
    selectMode?: boolean
    selected?: boolean
  }>()
</script>

<template>
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
</template>

<style scoped>
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
