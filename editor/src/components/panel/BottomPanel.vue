<script lang="ts" setup>
  import { shallowRef } from 'vue'
  import { usePreviewStore } from '@/stores/preview'
  import ConsoleList from './ConsoleList.vue'

  type PanelTab = 'problems' | 'columns' | 'console'

  const tab = shallowRef<PanelTab>('problems')
  const preview = usePreviewStore()
</script>

<template>
  <section class="bottom-panel">
    <v-tabs
      v-model="tab"
      class="bottom-panel__tabs"
      color="primary"
      density="compact"
    >
      <v-tab text="問題" value="problems" />
      <v-tab text="欄位查詢" value="columns" />
      <v-tab text="控制台" value="console" />
    </v-tabs>

    <v-tabs-window v-model="tab" class="bottom-panel__body">
      <v-tabs-window-item class="bottom-panel__empty text-medium-emphasis" value="problems">
        沒有問題
      </v-tabs-window-item>

      <v-tabs-window-item class="bottom-panel__empty text-medium-emphasis" value="columns">
        沒有表
      </v-tabs-window-item>

      <v-tabs-window-item class="bottom-panel__console" value="console">
        <ConsoleList :entries="preview.entries" @clear="preview.clearEntries" />
      </v-tabs-window-item>
    </v-tabs-window>
  </section>
</template>

<style scoped>
.bottom-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bottom-panel__tabs {
  flex: none;
}

.bottom-panel__body {
  flex: 1;
  min-height: 0;
}

.bottom-panel__body :deep(.v-window__container) {
  height: 100%;
}

.bottom-panel__empty {
  padding: 16px;
}

.bottom-panel__console {
  height: 100%;
}
</style>
