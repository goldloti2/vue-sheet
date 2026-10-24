# FieldsDialog

詢問幾個欄位的對話框，以 `AppDialog` 為基礎。內容為只顯示 `keys` 中各欄的 `DataForm`，並自帶取消與確定按鈕。

> **通常不直接使用此元件**。呼叫 `askFields()` 即可（見 [actions.md](../../topics/actions.md#快速編輯對話框)）。`AppShell` 已掛載一個實例，按下確定或取消時 promise 即 resolve。只有須自行管理狀態的特殊情況，才直接放置此元件。

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
| `v-model:form` | `object` | **必填**，表單的值。元件只修改 `keys` 中的欄位 |
| `title` | `string` | **必填** |
| `schema` | `TableSchema` | **必填** |
| `keys` | `string[]` | **必填**，要詢問的欄位 |
| `errors` | `Record<string, string>` | `{ 欄位 key: 錯誤訊息 }`，交由 `DataForm` 顯示 |
| `lockId` | `boolean?` | 修改既有的列時為 `true`，主鍵欄唯讀。`askFields` 提供 `rows` 時即為 `true` |

## Emits

| event | 說明 |
| --- | --- |
| `confirm` | 按下確定時發出。驗證與關閉由 handler 負責（`askFields` 已處理） |
