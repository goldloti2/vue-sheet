# DataTable

表格式列表。也用在 detail 頁內嵌的關聯子表格（一對多同頁顯示），兩種用途同一個元件。`columns` 可以混用 schema 真實欄位與 `extraColumns` 的 key，顯示順序照 `columns` 陣列。

## Usage

```vue
<script lang="ts" setup>
  import DataTable from '@/components/ui/DataTable.vue'

  const extraColumns = [{ key: '欄位2', label: '標籤2', value: (row: Row) => '內容' }]
</script>

<template>
  <DataTable
    :columns="['欄位1', '欄位2']"
    :extra-columns="extraColumns"
    :row-to="(row) => `/路徑/${row.id}`"
    :rows="rows"
    :schema="schema"
    :show-header="false"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `rows` | `readonly Row[]` | **必填** |
| `schema` | `TableSchema` | **必填** |
| `columns` | `string[]?` | 要顯示的欄位 key；省略＝全部欄位加全部 `extraColumns` |
| `showHeader` | `boolean?` | 預設 `true` |
| `extraColumns` | `{ key, label, value: (row) => string }[]?` | 不存在 schema 裡、每列各自算出來的欄位 |
| `rowTo` | `((row) => string)?` | 有給才可點擊導覽；不給就是純顯示 |
