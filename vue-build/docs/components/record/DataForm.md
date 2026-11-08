# DataForm

表單版的 `DataDetail`：每個真實欄位以 [FieldInput](FieldInput.md) 依 `column.type` 自動選擇輸入元件，依 `order` 排序，省略時依 `schema.formOrder`。新增與編輯共用此元件，差別只在初始值。

**此元件不處理載入中與錯誤的狀態**，由 [FormLayerHost](../shell/FormLayerHost.md) 的表單處理。

`v-model` 綁定的列物件通常無須自行組合。表單層以 `useCreateForm`、`useEditForm` 取得現成的 `form`，初始值、載入與送出皆已處理。

驗證的做法相同：`errors` 直接接同一個 composable 回傳的 `fieldErrors`。此元件只把訊息顯示於對應欄位的下方，不自行判斷值是否合法。驗證規則寫在 schema 上，見 [schema.md](../../topics/schema.md#驗證)。

## Usage

```vue
<script lang="ts" setup>
  import { ref } from 'vue'
  import DataForm from '@/components/ui/record/DataForm.vue'
  import { emptyRow } from '@/schema/types'

  const form = ref(emptyRow(schema))
  const fieldErrors = ref({})
</script>

<template>
  <DataForm v-model="form" :errors="fieldErrors" :schema="schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `object` | **必填**，整個列物件，雙向綁定 |
| `schema` | `TableSchema` | **必填** |
| `errors` | `Record<string, string>` | `{ 欄位 key: 錯誤訊息 }`。省略時不顯示任何錯誤 |
| `order` | `string[]?` | 這一次的欄位順序，覆寫 schema 的 `formOrder` |
| `only` | `string[]` | 只顯示這些欄位，順序仍依 `order` 或 `formOrder`。`FieldsDialog` 使用此 prop，整頁的表單不使用 |
| `lockId` | `boolean?` | 修改既有的列時為 `true`，主鍵欄唯讀。表單層與 `FieldsDialog` 自行判斷後傳入 |

## 備註

- **必填的標記**：標示 `required` 的欄位，以及沒有 `newId` 的主鍵，交由 FieldInput 加上錯誤色的「*」。唯讀的欄位不標示，包括虛擬欄位與建立後的主鍵。各型別的輸入方式見 [FieldInput](FieldInput.md)
- **唯讀的欄位**（虛擬欄位、建立後的主鍵）：值的字色變淡，仍可選取複製。建立後的主鍵另在欄位內的左側加上鎖頭
- **虛擬欄位**：排進 `formOrder` 時，以唯讀的文字框顯示格式化後的值，隨輸入即時重算。計算前，元件先以 `store.withGetters` 為表單的列掛上與快取相同的 getter，因此讀取父列的虛擬欄位也能算出（見 [schema.md](../../topics/schema.md#欄位)）
- **主鍵欄**（schema 的 `idColumn`）：`lockId` 時唯讀，否則可填寫。schema 有 `newId` 時，欄位下方提示「留空即自動產生」（見 [schema.md](../../topics/schema.md#主鍵)）
