<script lang="ts" setup>
  import { RouterLink } from 'vue-router'
  import { useLongPress } from '@/composables/useLongPress'

  interface DataListProps {
    title: string
    topRight?: string
    bottomLeft?: string
    bottomRight?: string
    to?: string
  }

  defineProps<DataListProps>()

  const emit = defineEmits<{
    longpress: [event: PointerEvent]
  }>()

  const longPress = useLongPress(event => emit('longpress', event))
</script>

<template>
  <component :is="to ? RouterLink : 'div'" class="list-item" :to="to" v-on="longPress">
    <div class="list-item__row">
      <span class="list-item__title text-title-medium font-weight-bold">{{ title }}</span>
      <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ topRight }}</span>
    </div>

    <div class="list-item__row">
      <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--left">{{ bottomLeft }}</span>
      <span class="list-item__field text-body-medium text-medium-emphasis list-item__field--right">{{ bottomRight }}</span>
    </div>
  </component>
</template>

<style scoped>
.list-item {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  color: inherit;
  text-decoration: none;
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.list-item__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
}

.list-item__row + .list-item__row {
  margin-top: 4px;
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
