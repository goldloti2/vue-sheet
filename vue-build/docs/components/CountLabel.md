# CountLabel

「名稱 + 筆數」：筆數做成一個小標籤跟在名稱後面。數字多一位就自己變寬，高度與圓角不變。

存在的理由只有一個——分組標題（[GroupedList](GroupedList.md)）與子表區塊標題（[ChildList](ChildList.md)）要長得一樣。自己寫頁面時想標筆數也可以直接用。

## Usage

```vue
<div class="text-title-medium font-weight-bold">
  <CountLabel :count="rows.length" label="項目" />
</div>
```

**名稱**的字體大小與粗細由外面決定（它只是一段 inline 內容），所以同一個元件在 `v-list-subheader` 裡和在區塊標題裡各自跟著所在位置的樣式。

**標籤則是固定的**：高 20px、字 0.75rem、行高 1，自己置中。這裡不用 `v-chip`，是因為 chip 的內距與行高會跟著外面的標題樣式跑，數字站不正；底色用 `rgba(var(--v-theme-on-surface), 0.1)` 跟著主題走，疊在 `bg-surface-light` 的分組標題上也還看得出來。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `label` | `string` | **必填**，名稱 |
| `count` | `number` | **必填**，顯示在標籤裡的數字 |
