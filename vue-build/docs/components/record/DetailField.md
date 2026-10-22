# DetailField

單一欄位的「標籤 + 值」一列。`DataDetail` 內部就是用它，**一般 detail 頁不用直接碰**——需要在 detail 區塊外另外顯示欄位時才用。給了 `action` 就變成可點的一格，右邊顯示動作的圖示，按下去走 `runAction`（`confirm`、錯誤 snackbar 都有）。

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
| `label` | `string` | **必填**，左側標籤 |
| `value` | `DisplayValue` | **必填**，顯示的文字與條件式格式（`schema/format.ts` 的 `displayValue`），以 [FormattedValue](../view/FormattedValue.md) 畫出 |
| `image` | `string \| null?` | 有給就顯示圖片而不是 `value` 的文字（`DataDetail` 對 `image` 欄位自動帶入） |
| `action` | `(PageAction \| null)?` | 有給就整格可點，右邊顯示圖示；`null` 與沒給相同 |

## Slots

| slot | 說明 |
| --- | --- |
| `value` | 以輸入元件取代顯示的值（`DataDetail` 的快速編輯）。有 `action` 時，動作改為接在 slot 右邊的圖示按鈕，整格不再可點；名稱與值改為垂直置中 |

## 備註

- **標籤與值兩欄固定 38:62**：以 `minmax(0, …)` 指定，不被內容撐開；沒有空白的長字串（網址、編號）於任意處換行
- **dashboard 中的窄版**：所在面板寬度小於 200px（3 格以下）時，標籤與值改為上下兩行，標籤靠左（見 [DashboardPanel](../panel/DashboardPanel.md)）。一般頁面不會觸發
