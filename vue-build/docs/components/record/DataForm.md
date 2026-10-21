# DataForm

表單版的 `DataDetail`：每個真實欄位以 [FieldInput](FieldInput.md) 依 `column.type` 自動選輸入元件，依 `order` 排序，省略時依 `schema.formOrder`。新增與編輯共用，差別只在初始值。

**這個元件不包 loading / error 狀態**，由 [FormPage](../page/FormPage.md) 處理（範本見 `template/pages/edit.vue`）。

`v-model` 綁的 row 物件通常不用自己組——新增/編輯頁用 `useCreateForm`／`useEditForm` 拿現成的 `form`，起始值、載入、送出、導覽都處理好了。

驗證也一樣：`errors` 直接接同一個 composable 回傳的 `fieldErrors`，這個元件只負責把訊息畫到對應欄位旁邊，不自己判斷合法性（規則寫在 schema 上，見 [schema.md](../../topics/schema.md#驗證)）。

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
| `order` | `string[]?` | 這一頁的欄位順序，覆寫 schema 的 `formOrder`；`FormPage` 原樣轉交 |
| `only` | `string[]` | 只顯示這幾個欄位（順序仍照 `order`／`formOrder`）；`FieldsDialog` 用這個，整頁表單不需要 |
| `lockId` | `boolean?` | 修改既有的列時為 `true`，主鍵那一欄唯讀。`FormPage` 與 `FieldsDialog` 會自行判斷並傳入（`FormPage` 可由頁面以同名 prop 覆寫） |

## 備註

- **必填的標記**：標了 `required` 的欄位，以及沒有 `newId` 的主鍵，交給 FieldInput 加上錯誤色的「*」；唯讀的欄位（虛擬欄位、建立後的主鍵）不標。各型別的輸入方式見 [FieldInput](FieldInput.md)
- **唯讀的欄位**（虛擬欄位、建立後的主鍵）：值的字色變淡，仍可選取複製；建立後的主鍵另在欄位內左側加鎖頭
- **虛擬欄位**：排進 `formOrder` 時以唯讀的文字框顯示格式化後的值，隨輸入即時重算。計算前先以 `store.withGetters` 替表單的 row 掛上與快取相同的 getter，讀父列的虛擬欄位因此算得出來（見 [schema.md](../../topics/schema.md#欄位)）
- **主鍵那一欄**（schema 的 `idColumn`）：`lockId` 時唯讀；否則可填寫，schema 有 `newId` 時欄位下方提示「留空即自動產生」（見 [schema.md](../../topics/schema.md#主鍵)）
