# TabBar

頁籤。通常用來依某個 `select` 欄位篩選列表——選項可以直接讀該欄位的 `options`，不用另外維護一份重複的清單（取 `options` 前要先用 `column?.type === 'select'` 縮小型別，這個判斷不能省）。

## Usage

```vue
<script lang="ts" setup>
  import { ref } from 'vue'
  import TabBar from '@/components/ui/TabBar.vue'

  const tabs = ['選項1', '選項2']
  const selected = ref(tabs[0])
</script>

<template>
  <TabBar v-model="selected" :tabs="tabs" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `string` | **必填**，目前選中的頁籤 |
| `tabs` | `string[]` | **必填** |
