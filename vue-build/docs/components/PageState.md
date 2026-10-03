# PageState

「資料還沒到」的那一段畫面：載入中、載入失敗、找不到資料，三種狀態擋在內容前面，資料到手才畫 slot。

**這是全 App 唯一一份那串階梯**。頁面與內容元件都不要自己寫——`DataList`、`DataForm` 這類元件只負責「有資料時怎麼畫」，狀態一律由這層處理（`FormPage` 內部就是包著它）。

## Usage

```vue
<template>
  <v-container>
    <PageState :error="error" :loading="loading" spinner="linear">
      <DataList v-for="row in data" :key="row.id" :title="row.$label" />
    </PageState>
  </v-container>
</template>
```

單筆的頁面多給一個 `empty`：

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
| `empty` | `boolean?` | 載入完了但沒東西可顯示。列表用不到（空列表就是空的） |
| `emptyText` | `string?` | 預設「找不到這筆資料」 |
| `spinner` | `'circular' \| 'linear'?` | 預設 `circular`（置中圓圈，**取代**內容，單筆用）；列表用 `linear`，長條貼在內容上緣、**內容留著** |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 資料到手才渲染。裡面的元件不需要再判斷載入狀態 |

## 備註

- **`linear` 不會卸載內容**：同步鈕會重抓所有已載入的表，`loading` 又變 true；那時把列表換成進度條的話，`GroupedList` 的展開狀態會沒掉、畫面也會整個跳一下。所以長條是加在內容上面，不是取代內容（`circular` 則是取代，單筆頁面重抓時本來就沒東西可留）
- **動作失敗不要走這裡**：送出失敗、推送失敗那種錯誤要讓內容留在畫面上（表單不能消失），訊息顯示在內容底下——`FormPage` 的 `error` prop 就是這樣分的
- **一頁可以有好幾份**：主記錄之外的區塊（詳細頁內嵌的子表格、總覽頁的各區塊）各包各的，狀態不會互相影響
- 三種狀態的優先順序是 loading → error → empty，跟資料實際到手的順序一致
- **它渲染出來的不是單一元素**（資料到手時是「進度條 + slot」的 fragment），所以**不要讓它當頁面的 root**：頁面轉場的 `<Transition>` 只動得了單一元素的 root，fragment 會讓那一頁不播動畫並在 console 留下 `renders non-element root node` 的警告。三個版型（`ListPage`／`DetailPage`／`FormPage`）都在外面包一層 `div`，自己直接用 `PageState` 的頁面也要包（通常本來就包在 `v-container` 裡）
