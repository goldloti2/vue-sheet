<!-- 選用：依 select 欄位分頁籤的列表頁，同樣複製到 src/pages/__table__/index.vue
     各頁籤的列表為 _ref/list.vue（複製到 src/pages/__table__/_ref/__Table__List.vue）。
     搜尋、篩選與排序由 TabPage 統一登記並跨頁籤共用，見 docs/topics/search.md 的「同一頁面中的多張表」與 docs/components/panel/TabPage.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import TabPage from '@/components/ui/panel/TabPage.vue'
  import { optionsOf } from '@/schema/options'
  import StatusList from './_ref/__Table__List.vue'

  // 頁籤直接取自 select 欄位的 options，不另外維護清單
  const statusTabs = optionsOf('__table__', 'status')
</script>

<template>
  <TabPage :tabs="statusTabs">
    <template #default="{ tab }">
      <StatusList :status="tab" />
    </template>
  </TabPage>
</template>
