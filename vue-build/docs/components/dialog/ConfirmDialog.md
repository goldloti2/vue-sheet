# ConfirmDialog

確認框，以 `AppDialog` 為基礎。左側固定為一顆「取消」，右側為呼叫端提供的選項，通常只有一顆「確定」。另外有載入中的狀態與錯誤訊息區。

> **通常不直接使用此元件**。動作宣告 `confirm: { title, text }`，或於程式中呼叫 `confirm(title, text)` 取得 `Promise<boolean>`（見 [actions.md](../../topics/actions.md#快速編輯對話框)）。兩種方式皆由 `AppShell` 掛載的實例處理。只有須自行管理狀態時（例如框內要顯示載入中或錯誤），才直接放置此元件。

## 兩個以上的選項

同一個元件也用於有兩個去向的問題。呼叫 `choose(title, text, choices)` 取得 `Promise<string | null>`：

- 按下某個選項時，回傳該選項的 `key`
- 按下取消、點擊框外或換頁時，回傳 `null`

```ts
const picked = await choose('Sheet已被別處修改', '要強制推送，還是重新抓取？', [
  { key: 'discard', label: '放棄並重新抓取' },
  { key: 'force', label: '強制推送', color: 'error' },
])
```

`confirm()` 即為只有一個選項 `{ key: 'ok', label: '確定', color: 'error' }` 的 `choose()`。因此兩者共用同一個實例與同一套關閉規則。

## Usage

```vue
<script lang="ts" setup>
  import ConfirmDialog from '@/components/ui/dialog/ConfirmDialog.vue'
</script>

<template>
  <ConfirmDialog
    v-model="open"
    :choices="[{ key: 'ok', label: '確定', color: 'error' }]"
    text="內容"
    title="標題"
    @choose="handleChoose"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `boolean` | **必填**，開關 |
| `title` | `string` | **必填** |
| `text` | `string` | **必填**，確認訊息 |
| `choices` | `DialogChoice[]` | **必填**，右側的按鈕（`{ key, label, color? }`）。「取消」無須列出 |
| `loading` | `boolean?` | 選項按鈕的載入中狀態 |
| `error` | `string \| null?` | 有值時，於內容下方顯示錯誤 |

## Emits

| event | 說明 |
| --- | --- |
| `choose` | 按下某個選項時發出，帶有該選項的 `key`。關閉對話框由 handler 負責（`useDialogs` 已處理） |
