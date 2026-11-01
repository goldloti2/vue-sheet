# DetailHeader

詳細頁整頁最上方的**標頭區塊**，顯示這一列的重要資訊。結構為 [DataCard](../list/DataCard.md) 去掉第 1 層：標題、副標與摘要疊於大圖上，動作接於圖片下方。

**一般無須直接使用此元件**：將 `defineView` 的結果交給 [DetailPage](../page/DetailPage.md) 的 `header` prop 即可，DetailPage 將標頭置於 `#top` slot 之上。標頭於資料載入後才顯示，`row` 必定存在。因此 `actions` 可直接呼叫以列為參數的動作，無須經過 `useRowAction`。

## Usage

範本見 `template/pages/detail.vue`：以 `defineView` 定義後交給 `DetailPage` 的 `header`。範本只指定標題與副標，`image` 與 `actions` 的用法見範本中的註解與下方的「使用的位置」。

## 使用的位置

| 位置 | 顯示於 |
| --- | --- |
| `image` | 寬度貼齊畫面兩側的大圖，比例固定，裁切填滿，高度有上限 |
| `title` | 大標題 |
| `subtitle` | 標題下方 |
| `summary` | 副標下方，與上方隔一行 |
| `actions` | 圖片下方的左右各兩格，由 [ViewActions](../view/ViewActions.md) 的 `variant="slots"` 呈現：前兩格靠左，後兩格靠右，`null` 保留為空格，第五個以後不顯示 |

- 每個位置皆可省略。全部沒有內容時，整個標頭不顯示
- `aside` 不顯示

## 有圖片與沒有圖片

| | 有圖片 | 沒有圖片 |
| --- | --- | --- |
| 寬度 | 貼齊畫面兩側 | 與欄位區相同（`v-container`） |
| 高度 | 依圖片的比例，有上限 | 只有文字的高度 |
| 文字 | 疊於圖片下緣，底下墊一層漸層 | 置於欄位區的寬度內 |

- 比例、高度上限與文字的顏色見 [design/detail.md](../../design/detail.md#尺寸與樣式) 的「尺寸與樣式」
- 兩種情況下，動作皆位於圖片或文字的下方，寬度與欄位區相同
- 標頭的最下方有一條分隔線，與下方的內容隔開，寬度與欄位區相同

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，這一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
