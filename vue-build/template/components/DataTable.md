# DataTable

表格式列表。也用在 detail 頁內嵌的關聯子表格（一對多同頁顯示），兩種用途同一個元件。`columns` 可以混用真實欄位與 schema `virtualColumns` 的 key，顯示順序照 `columns` 陣列。每列各自算的東西（例如小計）寫成那張表的虛擬欄位，這裡直接用 key 指。

## Usage

```vue
<script lang="ts" setup>
  import DataTable from '@/components/ui/DataTable.vue'
</script>

<template>
  <DataTable
    :columns="['欄位1', '虛擬欄位']"
    :row-to="(row) => `/路徑/${row.id}`"
    :rows="rows"
    :show-header="false"
    table="__table__"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `rows` | `readonly Row[]` | **必填** |
| `table` | `TableKey` | **必填**，schema 與虛擬欄位都從它取 |
| `columns` | `string[]?` | 要顯示的欄位 key；省略＝全部真實欄位加全部虛擬欄位 |
| `showHeader` | `boolean?` | 預設 `true` |
| `rowTo` | `((row) => string)?` | 有給才可點擊導覽；不給就是純顯示 |
