<!-- 選用：同時顯示多個面板的總覽頁，複製到 src/pages/dashboard.vue（檔名即路由，可自訂）→ /dashboard
     __parent__ 為父表、__table__ 為子表（子表有 ref 欄位指向父表）；兩張表各需一份 _ref/list.vue，父表另需 detail.vue
     排版、互動與各面板的行為見 docs/components/DashboardPage.md 與 DashboardPanel.md -->
<route lang="json5">
{ meta: { title: '總覽' } }
</route>

<script lang="ts" setup>
  import DashboardPage from '@/components/ui/panel/DashboardPage.vue'
  import DashboardPanel from '@/components/ui/panel/DashboardPanel.vue'
  // 既有的頁面以元件 import，其 <route> 不生效；含 TabPage 的頁面不可放入，改用 _ref/ 中的列表
  import ParentDetail from './__parent__/[id]/index.vue'
  import ParentList from './__parent__/_ref/__Parent__List.vue'
  import ChildTableList from './__table__/_ref/__Table__List.vue'

  // 以面板的 name 對應，手機（寬 6 格）與電腦（寬 24 格）分別指定；{ w, h } 固定、{ h } 只控制高（寬同自動）、未列出或留空為自動。
  // 依宣告的順序放入，沒給 x、y 時接在上一個面板的右側，放不下即換列
  const layout = {
    parents: { desktop: { w: 8, h: 14 } },
    parent: { mobile: { h: 6 }, desktop: { w: 16, h: 7 } },
    children: { desktop: { w: 16, h: 7 } },
  }
</script>

<template>
  <!-- interactive：點擊一列改為選取，父表詳細顯示選取的那一筆，子表只列出它的子列 -->
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
