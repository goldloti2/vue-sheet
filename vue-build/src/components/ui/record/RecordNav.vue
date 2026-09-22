<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import { mdiMenuLeft, mdiMenuRight } from '@mdi/js'
  import { onActivated, onDeactivated, shallowRef } from 'vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'

  const props = defineProps<{
    table: TableKey
    id: string
  }>()

  const { goNext, goPrev, siblings } = useSiblingNav(props.table, () => props.id)

  // 跟 PageFab 同一個理由：頁面轉場中的 transform 會讓祖先變成 fixed 的定位基準，
  // 不 teleport 出去按鈕就會跟著頁面橫移
  const isActive = shallowRef(true)
  onActivated(() => {
    isActive.value = true
  })
  onDeactivated(() => {
    isActive.value = false
  })
</script>

<template>
  <Teleport to="body">
    <template v-if="isActive">
      <v-btn
        v-if="siblings.prev"
        aria-label="上一筆"
        class="record-nav record-nav--left"
        rounded="0"
        variant="text"
        @click="goPrev"
      >
        <v-icon :icon="mdiMenuLeft" size="36" />
      </v-btn>

      <v-btn
        v-if="siblings.next"
        aria-label="下一筆"
        class="record-nav record-nav--right"
        rounded="0"
        variant="text"
        @click="goNext"
      >
        <v-icon :icon="mdiMenuRight" size="36" />
      </v-btn>
    </template>
  </Teleport>
</template>

<style scoped>
.record-nav {
  position: fixed;
  top: 50%;
  z-index: 2000;
  width: 20px;
  min-width: 0;
  height: 72px;
  padding: 0;
  transform: translateY(-50%);
}

.record-nav--left {
  left: 0;
}

.record-nav--right {
  right: 0;
}
</style>
