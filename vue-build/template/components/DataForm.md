# DataForm

表單版的 `DataDetail`：依 `column.type` 自動選輸入元件（`text` → `v-text-field`、`number` → `v-number-input`、`date` → `v-date-input`、`select` → `v-select`、`ref` 目前仍是純文字輸入），依 `schema.formOrder` 排序。新增與編輯共用，差別只在初始值。

跟 `DataDetail` 不同，**這個元件不包 loading / error 狀態**，編輯頁要自己處理（見 `table/pages/edit.vue`）。

`v-model` 綁的 row 物件通常不用自己組——新增/編輯頁用 `useCreateForm`／`useEditForm` 拿現成的 `form`，起始值、載入、送出、導覽都處理好了。

## Usage

```vue
<script lang="ts" setup>
  import DataForm from '@/components/ui/DataForm.vue'
  import { useCreateForm } from '@/composables/useTableForm'

  const { form } = useCreateForm('__table__', schema)
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
