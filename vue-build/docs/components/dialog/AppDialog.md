# AppDialog

對話框的外殼，只負責「框」：標題、內容區與動作區。**此元件不預設任何按鈕的語意**。需要「是／否」的確認框時，使用 `ConfirmDialog`。

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
| `title` | `string?` | 標題列。省略時不顯示 |
| `maxWidth` | `string \| number?` | 預設 `400` |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 內容區 |
| `actions` | 底部的動作區。未提供時不顯示 |
