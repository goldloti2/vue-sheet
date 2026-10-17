# DataForm

表單版的 `DataDetail`：依 `column.type` 自動選輸入元件（`text` → `v-text-field`、`number` → `v-number-input`、`date` → `v-date-input`、`duration` → `v-text-field`（填「時:分:秒」）、`select` → `v-select`、`ref` → `v-autocomplete`，對方整表的可搜尋下拉清單，每列文字是對方的 `$label`；`image` 跟 `text` 一樣是 `v-text-field`，貼網址或 Drive 連結），依 `schema.formOrder` 排序。新增與編輯共用，差別只在初始值。

跟 `DataDetail` 不同，**這個元件不包 loading / error 狀態**，編輯頁要自己處理（見 `table/pages/edit.vue`）。

`v-model` 綁的 row 物件通常不用自己組——新增/編輯頁用 `useCreateForm`／`useEditForm` 拿現成的 `form`，起始值、載入、送出、導覽都處理好了。

驗證也一樣：`errors` 直接接同一個 composable 回傳的 `fieldErrors`，這個元件只負責把訊息畫到對應欄位旁邊，不自己判斷合法性（規則寫在 schema 上，見 `table/schema.ts`）。

## Usage

```vue
<script lang="ts" setup>
  import DataForm from '@/components/ui/record/DataForm.vue'
  import { useCreateForm } from '@/composables/form/useTableForm'

  const { form, fieldErrors } = useCreateForm('__table__', schema)
</script>

<template>
  <DataForm v-model="form" :errors="fieldErrors" :schema="schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `object` | **必填**，整個 row 物件（雙向） |
| `schema` | `TableSchema` | **必填** |
| `errors` | `Record<string, string>` | `{ 欄位 key: 錯誤訊息 }`，省略就不顯示任何錯誤 |
| `only` | `string[]` | 只顯示這幾個欄位（順序仍照 `formOrder`）；`FieldsDialog` 用這個，整頁表單不需要 |
