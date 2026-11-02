<!-- 選用：同時顯示多個面板的總覽頁，複製到 src/pages/dashboard.vue（檔名即路由，可自訂）→ /dashboard
     __parent__ 為父表，__table__ 為子表（子表有 ref 欄位指向父表）。兩張表各需一份 _ref/list.vue，父表另需 detail.vue
     排版見 docs/design/dashboard.md，互動與各面板的行為見 docs/components/panel/DashboardPage.md 與 DashboardPanel.md -->
<route lang="json5">
{ meta: { title: '總覽' } }
</route>

<script lang="ts" setup>
  import DashboardPage from '@/components/ui/panel/DashboardPage.vue'
  import DashboardPanel from '@/components/ui/panel/DashboardPanel.vue'
  import { useDashboardLinks } from '@/composables/shell/useDashboardLinks'
  // 既有的頁面以元件 import，其 <route> 不生效
  import ParentDetail from './__parent__/[id]/index.vue'
  import ParentList from './__parent__/_ref/__Parent__List.vue'
  import ChildTableList from './__table__/_ref/__Table__List.vue'

  // 面板之間的連動。不須連動時省略，DashboardPage 也不傳 links
  const links = useDashboardLinks()

  // 以面板的 name 對應，手機與電腦分別指定（格數與規則見 docs/design/dashboard.md）
  const layout = {
    parents: { desktop: { w: 16, h: 28 } },
    parent: { mobile: { h: 12 }, desktop: { w: 32, h: 14 } },
    children: { desktop: { w: 32, h: 14 } },
  }
</script>

<template>
  <!-- 各面板預設有自己的搜尋、篩選與排序。加上 shared 的面板改為加入全頁共用的一份 -->
  <DashboardPage :layout="layout" :links="links">
    <!-- selects：點擊一列為選取，不換頁 -->
    <DashboardPanel name="parents" selects table="__parent__" title="父表">
      <ParentList />
    </DashboardPanel>

    <!-- 詳細頁在 scope 剛好一列時顯示這一列：此處為父表列表中選取的列 -->
    <DashboardPanel name="parent" :scope="links.selectionOf('parents')" table="__parent__" title="父表詳細">
      <ParentDetail />
    </DashboardPanel>

    <!-- 只列出所選父列的子列，__parent__ 為子表指向父表的 ref 欄位。尚未選取時不列出任何列，selectionOf 加上 'all' 即列出全部 -->
    <DashboardPanel
      name="children"
      :scope="links.childrenOf(links.selectionOf('parents'), '__parent__')"
      table="__table__"
      title="子表"
    >
      <ChildTableList />
    </DashboardPanel>
  </DashboardPage>
</template>
