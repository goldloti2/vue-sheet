# FieldsDialog

「問幾個欄位」對話框，建立在 `AppDialog` 上：內容是只顯示 `keys` 那幾欄的 `DataForm`，自己帶取消／確定按鈕。

> **通常不直接用**——叫 `askFields()` 就好（見 `README.md` 的「問幾個欄位」），`AppShell` 已經掛了一個實例，promise 會在按確定或取消時 resolve。這個元件只在需要自己管狀態的特殊情況才直接擺。

## Usage

```vue
<script lang="ts" setup>
  import FieldsDialog from '@/components/ui/dialog/FieldsDialog.vue'
</script>

<template>
  <FieldsDialog
    v-model="open"
    v-model:form="form"
    :errors="errors"
    :keys="['status', 'date']"
    :schema="schema"
    title="標題"
    @confirm="handleConfirm"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `boolean` | **必填**，開關 |
| `v-model:form` | `object` | **必填**，表單值（只會動到 `keys` 裡的欄位） |
| `title` | `string` | **必填** |
| `schema` | `TableSchema` | **必填** |
| `keys` | `string[]` | **必填**，要問哪幾個欄位 |
| `errors` | `Record<string, string>` | `{ 欄位 key: 錯誤訊息 }`，交給 `DataForm` 顯示 |

## Emits

| event | 說明 |
| --- | --- |
| `confirm` | 按下確定；驗證與關閉都是 handler 的責任（`askFields` 已經處理好） |
