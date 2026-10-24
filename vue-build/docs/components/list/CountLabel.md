# CountLabel

「名稱 + 列數」：列數以一個小標籤接在名稱後面。數字多一位時標籤自動變寬，高度與圓角不變。

分組標題（[GroupedList](GroupedList.md)）與子表區塊的標題（[ChildList](../page/ChildList.md)）皆使用此元件。自行撰寫的頁面要標示列數時，也可以直接使用。

## Usage

```vue
<div class="text-title-medium font-weight-bold">
  <CountLabel :count="rows.length" label="項目" />
</div>
```

**名稱**的字級與粗細由外層決定，此元件只是一段行內內容。因此同一個元件置於 `v-list-subheader` 中與置於區塊標題中時，各自沿用所在位置的樣式。

**標籤的樣式則固定**：
- 高 20px，字級 0.75rem，行高 1，內容自行置中
- 不使用 `v-chip`
- 底色為 `rgba(var(--v-theme-on-surface), 0.1)`，隨主題變化

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `label` | `string` | **必填**，名稱 |
| `count` | `number` | **必填**，標籤中的數字 |
