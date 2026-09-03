# DataDetail

整個 detail 頁的欄位區，**自己包含 loading / error / 找不到資料三種狀態**，頁面把 `useTableRow` 的回傳直接接上去就好。`type: 'ref'` 的欄位會自動連到 `/{refTable}/{值}`，不用另外處理。

`extraFields` 是不存在 Sheet 裡、這個畫面才算出來的欄位；它的 key 也可以排進 `schema.detailOrder`，跟真實欄位一起排序。

## Usage

```vue
<script lang="ts" setup>
  import { computed } from 'vue'
  import DataDetail from '@/components/ui/DataDetail.vue'

  const extraFields = computed(() => [
    { key: '欄位1', label: '標籤1', value: '內容', to: '/路徑' },
  ])
</script>

<template>
  <DataDetail
    :error="error"
    :extra-fields="extraFields"
    :loading="loading"
    :row="row"
    :schema="schema"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `schema` | `TableSchema` | **必填** |
| `row` | `object \| null` | **必填** |
| `loading` | `boolean` | **必填** |
| `error` | `string \| null` | **必填** |
| `extraFields` | `{ key, label, value, to? }[]?` | 畫面計算欄位；有 `to` 就變連結 |
