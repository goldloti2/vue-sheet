# PageFab

右下角浮動按鈕。數量 ≤2 顆固定顯示，≥3 顆自動收合成 speed-dial（展開時有暗屏與文字標籤），不用自己判斷。`actions` 裡的 `null`（不適用的動作）會略過，略過後一個都不剩時整個元件不顯示。

`PageAction` 一律用 `onClick`，要導覽就在裡面自己 `router.push`。同一種型別也給 `useAppBarActions()` 用，同一份動作定義可以任選要擺右下角還是右上角。

**列表頁與詳細頁不用自己擺這個元件**：把動作交給 [ListPage](../page/ListPage.md)／[DetailPage](../page/DetailPage.md) 的 `fab` prop 就好，它們內部放的就是它。直接用的場合是自己組版面的頁面。

位於儀表板的面板中時，僅於該面板展開後顯示（讀取 `usePanelFullPage()`，不在面板中時一律為 `true`）。

## Usage

```vue
<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiPlus } from '@mdi/js'
  import { useRouter } from 'vue-router'
  import PageFab from '@/components/ui/shell/PageFab.vue'

  const router = useRouter()

  const actions: PageAction[] = [
    { key: '動作1', label: '標籤1', icon: mdiPlus, onClick: () => void router.push('/路徑') },
  ]
</script>

<template>
  <PageFab :actions="actions" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `actions` | `(PageAction \| null)[]` | **必填**，`{ key, label, icon, onClick, confirm? }`，`null` 略過。有 `confirm: { title, text }` 就會先跳確認框，對話框由 `AppShell` 渲染，這裡不用管 |
