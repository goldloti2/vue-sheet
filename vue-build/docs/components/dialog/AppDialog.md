# AppDialog

對話框外殼，只管「框」：標題、內容區、動作區。**不預設任何按鈕語意**——需要是/否確認框請用 `ConfirmDialog`。

## Usage

```vue
<script lang="ts" setup>
  import AppDialog from '@/components/ui/dialog/AppDialog.vue'
</script>

<template>
  <AppDialog v-model="open" :max-width="400" title="標題">
    內容

    <template #actions>
      <v-spacer />
      <v-btn @click="open = false">動作1</v-btn>
      <v-btn @click="handleAction">動作2</v-btn>
    </template>
  </AppDialog>
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `boolean` | **必填**，開關 |
| `title` | `string?` | 標題列，省略就不顯示 |
| `maxWidth` | `string \| number?` | 預設 `400` |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 內容區 |
| `actions` | 底部動作區；沒給就不顯示 |
