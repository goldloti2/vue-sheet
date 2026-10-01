# ConfirmDialog

確認框，建立在 `AppDialog` 上。左邊永遠一顆「取消」，右邊是呼叫端給的選項（通常只有一顆「確定」），另外帶 loading 狀態與錯誤訊息區。

> **通常不直接用**——動作宣告 `confirm: { title, text }`，或程式裡叫 `confirm(title, text)` 拿 `Promise<boolean>`（見 `README.md`），`AppShell` 掛的那個實例會處理。這個元件只在需要自己管狀態（例如框內要顯示 loading／錯誤）時直接擺。

## 兩個以上的選項

同一個元件也畫「兩條出路」的問題，用 `choose(title, text, choices)` 拿 `Promise<string | null>`——回傳按下去那顆的 `key`，取消／點外面／換頁都是 `null`：

```ts
const picked = await choose('Sheet已被別處修改', '要強制推送，還是重新抓取？', [
  { key: 'discard', label: '放棄並重抓' },
  { key: 'force', label: '強制推送', color: 'error' },
])
```

`confirm()` 就是只給一顆 `{ key: 'ok', label: '確定', color: 'error' }` 的 `choose()`，所以兩者共用同一個實例與同一套關閉規則。

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
| `choices` | `DialogChoice[]` | **必填**，右邊那幾顆鈕（`{ key, label, color? }`）。「取消」不用列 |
| `loading` | `boolean?` | 選項鈕的 loading |
| `error` | `string \| null?` | 有值就在內容下方顯示錯誤 |

## Emits

| event | 說明 |
| --- | --- |
| `choose` | 按下某個選項，帶著它的 `key`；關閉對話框是 handler 的責任（`useDialogs` 已經處理好） |
