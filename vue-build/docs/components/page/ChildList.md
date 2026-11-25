# ChildList

詳細頁中的子表區塊。區塊是縮小的展開頁，包含：
- 標題，後面接列數
- 前幾列子列
- 沒有子列時的文字
- 右下角一行按鈕：「展開」，以及展開頁的 FAB（通常為「新增」）

此元件置於 [DetailPage](DetailPage.md) 的 `#top` 或 default slot 中，其中放置一個導入的展開頁。子表為頁面的主體時，置於 `#top`。

子列、每一列的版面與動作皆寫於展開頁，詳細頁只指定標題與區塊的設定。展開頁的範本見 [`template/pages/child-list.vue`](../../../template/pages/child-list.vue)。

## Usage

```vue
<script lang="ts" setup>
  import ChildPage from './__table__.vue'
</script>

<DetailPage … table="__parent__">
  <template #default="{ row: parent }">
    <ChildList title="子表" :to="`/__parent__/${parent.id}/__table__`">
      <ChildPage />
    </ChildList>
  </template>
</DetailPage>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | **必填**，區塊的標題。列數以 [CountLabel](../list/CountLabel.md) 接在標題後面 |
| `limit` | `number?` | 最多先顯示幾列，預設 5。`0` 表示全部列出。列數依全部的子列計算 |
| `to` | `string?` | 「展開」前往的頁面，通常為其中的展開頁的網址。提供時一律顯示「展開」，不論子列是否超過 `limit`。省略時沒有「展開」 |
| `emptyText` | `string?` | 沒有任何子列時顯示的文字，預設「還沒有資料」 |
| `hideEmpty` | `boolean?` | 沒有任何子列時，整塊不顯示，包括標題、「展開」與按鈕。預設 `false` |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | — | 一個展開頁。只支援以 [ListPage](ListPage.md) 呈現的頁面。頁面的 `<route>` 於導入時不生效 |

## 展開頁

展開頁的網址為 `/__parent__/:id/…`。一個檔案同時用於所有的父列，也用於詳細頁的區塊。

- 以 `useRecordPage` 取得父列，再以 `ListPage` 呈現父列上的 `$子表_欄位key` getter。子列已依子表的 `defaultSort` 排序，無須另外查詢
- 每一列的版面以 `item` 與 `view` 指定，或以 `#rows` 放置表格。`#rows` 的 `rows` 於區塊中為前 `limit` 列
- 新增子列的動作交給 `ListPage` 的 `fab`，預設值指向父列
- 各父表各有自己的展開頁

## 展開頁於區塊中的差異

| 展開頁所做的事 | 於區塊中 |
| --- | --- |
| `useRecordPage` 從網址取得 id | 父表與外層的詳細頁相同時，改取外層的詳細頁的 id |
| `ListPage` 列出的列 | 只顯示前 `limit` 列，不分組，沒有載入狀態 |
| `fab` | 顯示為「展開」旁的按鈕，按鈕的文字為動作的 `label`。`null` 略過 |
| `appBar` | 不顯示 |
| `selection` 的多選 | 不綁定 |
| `useListPage` 的搜尋、篩選與排序 | 不登記 |
| dashboard 面板的 `scope`、`mark`、`selects` 與輸出 | 不套用，也不輸出 |
| 點擊一列時發布的順序 | 與展開頁相同，為全部的子列，包含超過 `limit` 而沒有顯示的子列 |

**從子表區塊或展開頁點進某一列時，上一列、下一列在同一個父列的子列之間切換**，不依子表整張表的順序（見 [RecordNav](../record/RecordNav.md)）。

## 備註

- **列數顯示於標題旁的小標籤**。「展開」不寫列數，也不依子列是否超過 `limit` 而出現或消失
- **不需要「展開」時，不提供 `to`**：例如子列通常只有兩三列的關聯，可以 `:limit="0"` 全部列出。展開頁的檔案照常存在
- **區塊的按鈕與展開頁的 FAB 相同**，不能分別指定
- **使用 `hideEmpty` 時，沒有子列便沒有「新增」**：第一列子列須從其他位置新增
- **子列與列表頁相同，貼齊畫面的左右**，留白由內容決定（見 [ListLayout](../list/ListLayout.md)）。標題、沒有子列時的文字與按鈕與畫面的左右留白
- **沒有搜尋**：展開頁的資料來自父列的 getter，不經過 `useListPage`，因此沒有放大鏡
- **不支援多選**：多選操作在子表的列表頁進行
- **右下角的按鈕放不下時換行**，例如在儀表板的窄面板中
- 外觀由 `ChildBlock` 呈現，只供 `ListPage` 使用
