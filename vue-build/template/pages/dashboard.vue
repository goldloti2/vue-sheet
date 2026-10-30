<!-- 選用：同時顯示多個面板的總覽頁，複製到 src/pages/dashboard.vue（檔名即路由，可自訂）→ /dashboard
     __parent__ 為父表，__table__ 為子表（子表有 ref 欄位指向父表）。兩張表各需一份 _ref/list.vue，父表另需 detail.vue
     排版見 docs/design/dashboard.md，互動與各面板的行為見 docs/components/panel/DashboardPage.md 與 DashboardPanel.md -->
<route lang="json5">
{ meta: { title: '總覽' } }
</route>

<script lang="ts" setup>
  import DashboardPage from '@/components/ui/panel/DashboardPage.vue'
  import DashboardPanel from '@/components/ui/panel/DashboardPanel.vue'
  // 既有的頁面以元件 import，其 <route> 不生效。含 TabPage 的頁面不可放入，改用 _ref/ 中的列表
  import ParentDetail from './__parent__/[id]/index.vue'
  import ParentList from './__parent__/_ref/__Parent__List.vue'
  import ChildTableList from './__table__/_ref/__Table__List.vue'

  // 以面板的 name 對應，手機與電腦分別指定（格數與規則見 docs/design/dashboard.md）
  const layout = {
    parents: { desktop: { w: 16, h: 28 } },
    parent: { mobile: { h: 12 }, desktop: { w: 32, h: 14 } },
    children: { desktop: { w: 32, h: 14 } },
  }
</script>

<template>
  <!-- interactive：點擊一列改為選取，父表詳細顯示選取的列，子表只列出其子列。父表的篩選條件也往下連動至子表 -->
  <DashboardPage interactive :layout="layout">
    <DashboardPanel name="parents" table="__parent__" title="父表">
      <ParentList />
    </DashboardPanel>

    <DashboardPanel name="parent" table="__parent__" title="父表詳細">
      <ParentDetail />
    </DashboardPanel>

    <DashboardPanel name="children" table="__table__" title="子表">
      <ChildTableList />
    </DashboardPanel>
  </DashboardPage>
</template>
