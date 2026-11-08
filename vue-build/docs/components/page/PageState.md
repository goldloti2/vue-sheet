# PageState

資料尚未取得時的畫面。載入中、載入失敗、找不到資料三種狀態擋在內容前面，資料取得後才顯示 slot。

**此元件是全 App 唯一處理這三種狀態的地方**。頁面與內容元件皆不自行處理：`DataList`、`DataForm` 等元件只負責有資料時的顯示，狀態一律由此元件處理。表單層的內部即包著此元件。

## Usage

```vue
<template>
  <v-container>
    <PageState :error="error" :loading="loading" spinner="linear">
      <DataList v-for="row in data" :key="row.id" :row="row" :view="view" />
    </PageState>
  </v-container>
</template>
```

顯示單一列的頁面另外提供 `empty`：

```vue
<PageState :empty="!row" :error="error" :loading="loading">
  <DataDetail :row="row" :schema="schema" />
</PageState>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `loading` | `boolean?` | 載入中 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `empty` | `boolean?` | 已載入完成，但沒有內容可顯示。列表不使用此 prop，空列表即顯示為空 |
| `emptyText` | `string?` | 預設「找不到這一列」 |
| `spinner` | `'circular' \| 'linear'?` | 預設 `circular`：置中的圓圈，**取代**內容，用於單一列的頁面。列表使用 `linear`：長條貼在內容上緣，**保留**內容 |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 資料取得後才顯示。其中的元件無須再判斷載入狀態 |

## 備註

- **`linear` 不卸載內容**：進度條加在內容上方，不取代內容。`circular` 取代內容
- **動作失敗不經過此元件**：送出失敗、推送失敗等錯誤保留畫面上的內容，訊息顯示於內容下方，例如表單層的送出失敗
- **一頁可以有多個 PageState**：主要的那一列以外的區塊，例如詳細頁內嵌的子表表格、總覽頁的各區塊，各自包一個。各區塊的狀態互不影響
- 三種狀態的優先順序為 loading → error → empty
- **此元件的輸出不是單一元素**：資料取得時為「進度條 + slot」的 fragment。兩個版型（`ListPage`、`DetailPage`）皆在外層包一個 `div`
