# ChildList

詳細頁裡的「底下掛著的那些」：一個小標題（後面接筆數）、前幾列、空狀態，加上右下角一列按鈕（「展開」與頁面給的動作，通常是「新增」）。放在 [DetailPage](DetailPage.md) 的 `#top` 或 default slot 裡（子表是主體就放 `#top`）。

子列不用另外查——父列上有 store 掛好的 `$子表_欄位key` getter（照子表的 `defaultSort` 排好），直接餵進來。

## Usage

```vue
<DetailPage … table="__parent__">
  <template #default="{ row: parent }">
    <ChildList
      :actions="newChild"
      :rows="parent.$__table_____parent__"
      title="子表"
      :to="`/__parent__/${parent.id}/__table__`"
    >
      <!-- slot 拿到的是截斷後的那幾列，卡片就自己 v-for -->
      <template #default="{ rows: children }">
        <DataList v-for="child in children" :key="child.id" :title="child.$label" :to="`/__table__/${child.id}`" />
      </template>
    </ChildList>
  </template>
</DetailPage>
```

`newChild` 是這張子表的新增動作，預設值指向目前這個父列：

```ts
const { new: newChild } = use__Table__Actions({ defaults: () => ({ __parent__: id.value }) })
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | **必填**，區塊小標題。後面會自動接上筆數（`品項 (7)`） |
| `rows` | `readonly Row[]` | **必填**，全部子列（父列上的 `$子表_欄位key` getter，已照子表的 `defaultSort` 排好）。超過 `limit` 的只是沒顯示，不是沒傳進來——筆數也是照這個算 |
| `limit` | `number?` | 預設 5，最多先顯示幾列；`0` 就是全部列完 |
| `to` | `string?` | 「展開」要去的頁面。給了就一直顯示那顆鈕，不管有沒有超過 `limit`（位置固定，使用者不用猜今天有沒有） |
| `actions` | `PageAction[]?` | 排在「展開」旁邊的右下角，通常是「新增」 |
| `emptyText` | `string?` | 一列都沒有時顯示，預設「還沒有資料」 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ rows }` | **截斷後**的那幾列（不是全部）。要卡片就自己 `v-for` 一串 `DataList`，要表格就整批餵給 `DataTable`；型別跟著 `:rows` 走 |

給的是整批而不是一列一次，就是為了讓 `DataTable` 也放得進來：

```vue
<template #default="{ rows: children }">
  <DataTable :columns="['name', 'amount']" :row-to="(child) => `/__table__/${child.id}`" :rows="children" :schema="__table__Schema" :show-header="false" />
</template>
```

## 「展開」是一個真的頁面

不是就地展開，而是 `/__parent__/:id/__table__` 這種路由，範本在 [`template/pages/child-list.vue`](../../template/pages/child-list.vue)。一條父子關聯一份檔（同一個檔服務所有父列），內容就是 `useRecordPage` 拿父列 + `ListPage` 把 getter 的子列畫出來，約 20 行。

這樣做而不是就地展開，換到四件現成的事：返回鍵會回到詳細頁、頁面轉場動畫、App Bar 標題可以是子表的名字、以及 `ListPage` 會把這份順序發布出去——**所以從這裡點進某一筆，上／下一筆走的是「同一個父列底下的子列」**，而不是子表整張表的順序。

## 備註

- **有幾筆看標題**（`品項 (7)`），所以「展開」不用寫筆數，也不用因為有沒有超過 `limit` 而出現或消失
- **不想要「展開」就別給 `to`**：子列本來就只有兩三筆的關聯不用專門開一頁
- **沒有搜尋**：`useAppBarSearch` 只由 `useListPage` 登記，子表頁的資料來自父列的 getter，所以那一頁沒有放大鏡。子列多到需要搜尋時，正解是去那張子表自己的列表頁
- **不做多選**：批次操作在子表的列表頁做
