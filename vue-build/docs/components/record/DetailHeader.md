# DetailHeader

detail 頁整頁最上方的**標頭區塊**，讓人一眼看到這一筆的重要資訊。結構為 [DataCard](../list/DataCard.md) 去掉第 1 層：標題、副標題、摘要疊於大圖上，動作接於圖片下方。

**一般不需要直接使用**：將 `defineView` 的結果交給 [DetailPage](../page/DetailPage.md) 的 `header` prop 即可，DetailPage 會將它置於 `#top` slot 之上。標頭於資料載入後才渲染，`row` 必定存在，因此 `actions` 可直接呼叫以列為參數的動作，不需經過 `useRowAction`。

## Usage

範本見 `template/pages/detail.vue`：以 `defineView` 定義後交給 `DetailPage` 的 `header`；範本僅指定標題與副標，`image` 與 `actions` 的用法見其註解及下方的「使用的位置」。

## 使用的位置

| 位置 | 顯示於 |
| --- | --- |
| `image` | 寬度貼齊畫面兩側的大圖，固定 16:9、裁切填滿，高度以 `40vh` 為上限 |
| `title` | 大標題 |
| `subtitle` | 標題下方，字色較淡 |
| `summary` | 副標題下方，與上方隔一行 |
| `actions` | 圖片下方的左右各兩格，由 [ViewActions](../view/ViewActions.md) 的 `variant="slots"` 呈現：前兩個靠左、後兩個靠右，`null` 保留為空格，超過四個的部分不顯示 |

- 每個位置皆可省略；全部沒有內容時，整個標頭不渲染
- `aside` 不顯示

## 有圖片與沒有圖片

| | 有圖片 | 沒有圖片 |
| --- | --- | --- |
| 寬度 | 貼齊畫面兩側 | 與欄位區相同（`v-container`） |
| 高度 | 16:9，以 `40vh` 為上限 | 僅為文字的高度 |
| 文字 | 白色，疊於圖片下緣，底下墊一層由透明至深色的漸層 | 一般的文字顏色 |
| 背景 | 圖片 | 透明 |

動作在兩種情況下皆位於圖片或文字的下方，寬度與欄位區相同。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，這一筆 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
