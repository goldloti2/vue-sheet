# DataForm

表單版的 `DataDetail`：依 `column.type` 自動選輸入元件（`text` → `v-text-field`、`number` → `v-number-input`、`date` → `v-date-input`、`select` → `v-select`、`ref` 目前仍是純文字輸入），依 `schema.formOrder` 排序。新增與編輯共用，差別只在初始值。

跟 `DataDetail` 不同，**這個元件不包 loading / error 狀態**，編輯頁要自己處理（見 `table/pages/edit.vue`）。送出時用 `columnValues(form, schema)` 只挑 schema 裡的真實欄位。

## Usage

```vue
<script lang="ts" setup>
  import { ref } from 'vue'
  import DataForm from '@/components/ui/DataForm.vue'

  const form = ref({
    id: '',
    欄位1: null,
  })
</script>

<template>
  <DataForm v-model="form" :schema="schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `object` | **必填**，整個 row 物件（雙向） |
| `schema` | `TableSchema` | **必填** |
