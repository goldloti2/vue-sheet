# DataDetail

整個 detail 頁的欄位區，**自己包含 loading / error / 找不到資料三種狀態**，頁面把 `useTableRow` 的回傳直接接上去就好。`type: 'ref'` 的欄位會自動連到 `/{refTable}/{值}`，不用另外處理。

schema 的 `virtualColumns`（見 `table/schema.ts`）跟真實欄位一視同仁：自動顯示、可以排進 `detailOrder`、`type: 'ref'` 一樣變連結。要多顯示什麼算出來的東西，就加成虛擬欄位，這個元件不收頁面塞進來的欄位。

## Usage

```vue
<script lang="ts" setup>
  import DataDetail from '@/components/ui/DataDetail.vue'
</script>

<template>
  <DataDetail
    :error="error"
    :loading="loading"
    :row="row"
    :schema="__table__Schema"
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
