# PageFab

右下角的浮動按鈕。
- 手機版 2 個以下時固定顯示，3 個以上時自動收合為 speed-dial，展開時有暗屏與文字標籤。電腦版不收合，每個按鈕旁一律顯示文字標籤。頁面無須自行判斷
- `actions` 中的 `null`（不適用的動作）略過。略過後一個也不剩時，整個元件不顯示

`PageAction` 一律使用 `onClick`。須導覽時，在 `onClick` 中自行呼叫 `router.push`。`useAppBarActions()` 也使用同一種型別，因此同一份動作定義可任選置於右下角或右上角。

**列表頁與詳細頁無須自行放置此元件**：將動作交給 [ListPage](../page/ListPage.md) 或 [DetailPage](../page/DetailPage.md) 的 `fab` prop 即可，兩者內部即放置此元件。直接使用的場合為自行組合版面的頁面。

位於儀表板的面板中時，此元件只在該面板展開後顯示。判斷依據為 `usePanelFullPage()`，不在面板中時一律為 `true`。

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
| `actions` | `(PageAction \| null)[]` | **必填**，`{ key, label, icon, onClick, confirm? }`，`null` 略過。有 `confirm: { title, text }` 時先顯示確認框。對話框由 `AppShell` 顯示，此元件無須處理 |
