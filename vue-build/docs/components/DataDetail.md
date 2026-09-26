# DataDetail

detail 頁的欄位區：一列一欄，照 `detailOrder` 排。**載入中／載入失敗／找不到資料由 [PageState](PageState.md) 處理**（`DetailPage` 已經包好），所以拿到的 `row` 一定存在。`type: 'ref'` 的欄位顯示對方的名字（對方 schema 的 `labelColumn`，沒設就是 id），對方那張表會自動載進共用快取。

欄位右邊的動作（ref 前往對方、開網址、改成今天）由 `fieldActions` 決定：欄位 key → `PageActions`，一欄一個，整格都能點。從 `use__Table__Actions({ row })` 拿現成的，見 `table/use__Table__Actions.ts`；沒列的欄位就沒有按鈕，ref 的前往也要自己列。

schema 的 `virtualColumns`（見 `table/schema.ts`）跟真實欄位一視同仁：自動顯示、可以排進 `detailOrder`。要多顯示什麼算出來的東西，就加成虛擬欄位，這個元件不收頁面塞進來的欄位。

## Usage

一般不直接用——詳細頁用 [DetailPage](DetailPage.md)，它把狀態、上下筆、FAB 一起接好：

```vue
<template>
  <DataDetail :field-actions="fieldActions" :row="row" :schema="__table__Schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `schema` | `TableSchema` | **必填** |
| `row` | `object` | **必填**，且非空值 |
| `fieldActions` | `Record<string, PageActions>?` | 欄位 key → 動作，每欄只用第一個 |
