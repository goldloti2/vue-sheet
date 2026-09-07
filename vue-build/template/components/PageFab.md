# PageFab

右下角浮動按鈕。數量 ≤2 顆固定顯示，≥3 顆自動收合成 speed-dial（展開時有暗屏與文字標籤），不用自己判斷。`actions` 是空陣列時整個元件不顯示，不用另外包 `v-if`。

`PageAction` 一律用 `onClick`，要導覽就在裡面自己 `router.push`（理由見 repo 根目錄 README 4.5）。同一種型別也給 `useAppBarActions()` 用，同一份動作定義可以任選要擺右下角還是右上角。

## Usage

```vue
<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiPlus } from '@mdi/js'
  import { useRouter } from 'vue-router'
  import PageFab from '@/components/ui/PageFab.vue'

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
| `actions` | `PageAction[]` | **必填**，`{ key, label, icon, onClick, confirm? }`。有 `confirm: { title, text }` 就會先跳確認框，對話框由 `AppShell` 渲染，這裡不用管 |
