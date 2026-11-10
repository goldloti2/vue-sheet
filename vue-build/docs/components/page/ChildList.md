# ChildList

詳細頁中的子表區塊，包含：
- 標題，後面接列數
- 前幾列子列
- 沒有子列時的文字
- 右下角一行按鈕：「展開」，以及頁面提供的動作（通常為「新增」）

此元件置於 [DetailPage](DetailPage.md) 的 `#top` 或 default slot 中。子表為頁面的主體時，置於 `#top`。

子列無須另外查詢。store 在父列上掛有 `$子表_欄位key` getter，子列已依子表的 `defaultSort` 排序，直接傳入即可。

子列置於 [ListLayout](../list/ListLayout.md) 中，與列表頁相同：deck 的列與表格貼齊畫面的左右，卡片四周留白。標題、沒有子列時的文字與按鈕與畫面的左右留白。

## Usage

```vue
<DetailPage … table="__parent__">
  <template #default="{ row: parent }">
    <ChildList
      :actions="[newChild]"
      :rows="parent.$__table_____parent__"
      title="子表"
      :to="`/__parent__/${parent.id}/__table__`"
    >
      <!-- slot 提供截斷後的子列，卡片由頁面自行 v-for -->
      <template #default="{ rows: children }">
        <DataList v-for="child in children" :key="child.id" :row="child" :to="`/__table__/${child.id}`" :view="childView" />
      </template>
    </ChildList>
  </template>
</DetailPage>
```

`newChild` 為子表的新增動作，預設值指向目前這個父列。`childView` 指定子列顯示的欄位（見 [DataList](../list/DataList.md) 的「view」）：

```ts
const { new: newChild } = use__Table__Actions({ defaults: () => ({ __parent__: id.value }) })
const childView = defineView(__table__Schema, { title: '$label' })
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | **必填**，區塊的標題。列數以 [CountLabel](../list/CountLabel.md) 接在標題後面 |
| `rows` | `readonly Row[]` | **必填**，全部的子列，即父列上的 `$子表_欄位key` getter，已依子表的 `defaultSort` 排序。超過 `limit` 的子列只是不顯示，仍須傳入。列數依全部的子列計算 |
| `limit` | `number?` | 最多先顯示幾列，預設 5。`0` 表示全部列出 |
| `to` | `string?` | 「展開」前往的頁面。提供時一律顯示「展開」，不論子列是否超過 `limit` |
| `actions` | `(PageAction \| null)[]?` | 排在「展開」旁的右下角，通常為「新增」。`null` 略過 |
| `emptyText` | `string?` | 沒有任何子列時顯示的文字，預設「還沒有資料」 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ rows }` | **截斷後**的子列，不是全部。型別隨 `:rows` 而定。呈現方式：<br>・卡片：頁面自行 `v-for` `DataList`、`DataProfile` 或 `DataCard`。`DataGallery` 須再以 `ListLayout layout="grid"` 包住<br>・表格：整批交給 `DataTable` |

slot 提供的是整批子列，表格可直接交給 `DataTable`：

```vue
<template #default="{ rows: children }">
  <DataTable :columns="['name', 'amount']" :row-to="(child) => `/__table__/${child.id}`" :rows="children" :schema="__table__Schema" :show-header="false" />
</template>
```

## 「展開」是一個真正的頁面

「展開」不是就地展開，而是前往 `/__parent__/:id/__table__` 這類路由。範本見 [`template/pages/child-list.vue`](../../../template/pages/child-list.vue)。

- 一條父子關聯一個檔案，同一個檔案服務所有的父列
- 內容為：以 `useRecordPage` 取得父列，再以 `ListPage` 呈現 getter 中的子列，約 20 行

`ListPage` 會發布這份順序。**從展開頁點進某一列時，上一列、下一列在同一個父列的子列之間切換**，不依子表整張表的順序。

## 備註

- **列數顯示於標題旁的小標籤**。「展開」不寫列數，也不依子列是否超過 `limit` 而出現或消失
- **不需要「展開」時，不提供 `to`**：子列通常只有兩三列的關聯，無須另開一頁
- **沒有搜尋**：展開頁的資料來自父列的 getter，不經過 `useListPage`，因此沒有放大鏡
- **不支援多選**：多選操作在子表的列表頁進行
- **右下角的按鈕放不下時換行**，例如在儀表板的窄面板中
