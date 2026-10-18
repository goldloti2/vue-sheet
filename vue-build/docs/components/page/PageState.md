# PageState

「資料還沒到」的那一段畫面：載入中、載入失敗、找不到資料，三種狀態擋在內容前面，資料到手才畫 slot。

**這是全 App 唯一一份那串階梯**。頁面與內容元件都不要自己寫——`DataList`、`DataForm` 這類元件只負責「有資料時怎麼畫」，狀態一律由這層處理（`FormPage` 內部就是包著它）。

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

- **`linear` 不會卸載內容**：進度條加在內容上面，不取代內容（`circular` 則為取代）
- **動作失敗不經過這裡**：送出失敗、推送失敗等錯誤保留畫面上的內容，訊息顯示在內容底下，例如 `FormPage` 的 `error` prop
- **一頁可以有好幾份**：主記錄之外的區塊（詳細頁內嵌的子表格、總覽頁的各區塊）各包各的，狀態不會互相影響
- 三種狀態的優先順序是 loading → error → empty
- **它渲染出來的不是單一元素**（資料到手時是「進度條 + slot」的 fragment）。三個版型（`ListPage`／`DetailPage`／`FormPage`）都在外面包一層 `div`
