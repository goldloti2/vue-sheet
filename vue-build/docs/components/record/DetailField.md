# DetailField

單一欄位的「標籤 + 值」一行。`DataDetail` 內部即使用此元件，**一般的詳細頁無須直接使用**。須在詳細頁的欄位區之外另外顯示欄位時，才使用此元件。

提供 `action` 時，整格可點擊，右側顯示動作的圖示。按下後經由 `runAction` 執行，`confirm` 與錯誤的 snackbar 皆會生效。

## Usage

```vue
<script lang="ts" setup>
  import DetailField from '@/components/ui/record/DetailField.vue'
</script>

<template>
  <DetailField :action="action" label="標籤" value="內容" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `label` | `string` | **必填**，左側的標籤 |
| `value` | `DisplayValue` | **必填**，顯示的文字與條件式格式（`schema/format.ts` 的 `displayValue`），由 [FormattedValue](../view/FormattedValue.md) 顯示 |
| `image` | `string \| null?` | 提供時顯示圖片，不顯示 `value` 的文字。`DataDetail` 對 `image` 欄位自動帶入 |
| `action` | `(PageAction \| null)?` | 提供時整格可點擊，右側顯示圖示。`null` 與未提供相同 |
| `layout` | `('side' \| 'stacked')?` | `'side'` 為標籤與值左右並排，`'stacked'` 為標籤在上、值在下。省略時依 `config/app.ts` 的 `detailFieldLayout` |

## Slots

| slot | 說明 |
| --- | --- |
| `value` | 以輸入元件取代顯示的值，用於 `DataDetail` 的快速編輯。有 `action` 時，動作改為接在 slot 右側的圖示按鈕，整格不再可點擊。標籤與值改為垂直置中 |

## 備註

- **左右並排時兩欄固定 38:62**：比例以 `minmax(0, …)` 指定，欄寬不隨內容變寬。標籤靠右。沒有空白的長字串（例如網址、編號）可於任意處換行
- **上下兩行時**，標籤與值皆靠左：
  - 欄位動作的圖示仍在值的右側
  - 快速編輯的輸入元件佔滿值的那一行
  - 圖片置於標籤下方
- **dashboard 中的窄版**：所在面板為[窄面板](../../design/dashboard.md#窄面板)時，不論 `layout` 為何，一律上下兩行。一般頁面不會觸發窄版
