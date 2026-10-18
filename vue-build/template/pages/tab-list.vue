<!-- 選用：依 select 欄位分頁籤的列表頁，同樣複製到 src/pages/__table__/index.vue
     各頁籤的列表為 _ref/list.vue（複製到 src/pages/__table__/_ref/__Table__List.vue）；
     搜尋、篩選與排序由 TabPage 統一登記並跨頁籤共用，見 docs/search.md 的「同一頁面中的多張表」與 docs/components/panel/TabPage.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import { ref } from 'vue'
  import TabPage from '@/components/ui/panel/TabPage.vue'
  import { __table__Schema } from '@/schema/tables/__table__'
  import StatusList from './_ref/__Table__List.vue'

  // 頁籤直接取 select 欄位的 options，不另外維護一份清單（取 options 前須以 type 縮小型別）
  const statusColumn = __table__Schema.columns.find(column => column.key === 'status')
  const statusTabs = statusColumn?.type === 'select' ? statusColumn.options : []
  const selectedStatus = ref(statusTabs[0])
</script>

<template>
  <TabPage v-model="selectedStatus" :tabs="statusTabs">
    <template #default="{ tab }">
      <StatusList :status="tab" />
    </template>
  </TabPage>
</template>
