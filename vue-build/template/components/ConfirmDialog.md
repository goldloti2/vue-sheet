# ConfirmDialog

是/否確認框，建立在 `AppDialog` 上。自己帶取消/確定按鈕、loading 狀態與錯誤訊息區。

## Usage

```vue
<script lang="ts" setup>
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
</script>

<template>
  <ConfirmDialog
    v-model="open"
    text="內容"
    title="標題"
    @confirm="handleConfirm"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `boolean` | **必填**，開關 |
| `title` | `string` | **必填** |
| `text` | `string` | **必填**，確認訊息 |
| `loading` | `boolean?` | 確定鈕的 loading |
| `error` | `string \| null?` | 有值就在內容下方顯示錯誤 |

## Emits

| event | 說明 |
| --- | --- |
| `confirm` | 按下確定；關閉對話框是 handler 的責任（`useDeleteAction` 已經處理好） |
