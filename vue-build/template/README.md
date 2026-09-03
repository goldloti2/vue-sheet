# 範本（template/）

複製 → 改名 → 填空。這個資料夾**不在 `src/` 底下**，不會被 build／eslint／vue-tsc 掃到，所以裡面的檔案不用能編譯，也不會影響正式程式碼。

## 佔位字串

所有範本統一用這兩個標記當佔位符，複製後整份檔案 find-replace 就好：

| 佔位 | 換成 | 例子 |
| --- | --- | --- |
| `__table__` | 表的代稱（`schemas` 的 key、路由路徑、檔名） | `order` |
| `__Table__` | 該表的 PascalCase 前綴（型別、函式名） | `Order` |

`__Table__Row` → `OrderRow`、`__table__Schema` → `orderSchema`、`use__Table__Actions` → `useOrderActions`，兩次取代全部搞定。

> 刻意用 `__table__` 這種不像英文字的標記，而不是 `template` 這類真實單字——後者會連 Vue 的 `<template>` 標籤一起被取代，整個頁面就毀了。

複製時記得順手刪掉每個檔案開頭那行 `複製到 ...` 的註解。

---

## 1. 新增一張表

### 要複製的檔案

| 範本 | 複製到 | 說明 |
| --- | --- | --- |
| `table/schema.ts` | `src/schema/__table__.ts` | 欄位定義、排序、顯示順序 |
| `table/use__Table__Actions.ts` | `src/composables/actions/use__Table__Actions.ts` | 該表的新增/編輯/刪除動作集合 |
| `pages/list.vue` | `src/pages/__table__/index.vue` | 列表頁 → `/__table__` |
| `pages/detail.vue` | `src/pages/__table__/[id]/index.vue` | 詳細頁 → `/__table__/:id` |
| `pages/new.vue` | `src/pages/__table__/new.vue` | 新增表單 → `/__table__/new` |
| `pages/edit.vue` | `src/pages/__table__/[id]/edit.vue` | 編輯表單 → `/__table__/:id/edit` |

> 路由是檔案式的（unplugin-vue-router），放進 `pages/` 就自動生效，不用維護路由表。
> 注意：同一個 `:id` 一律用 `[id]/index.vue` + `[id]/edit.vue` 的**資料夾**寫法，不要用 `[id].vue`。

### 要改的既有檔案（4 處）

1. **`src/schema/index.ts`** — 註冊 schema，`TableKey` 會自動多一個值：
   ```ts
   import { __table__Schema } from './__table__'

   export const schemas = {
     __table__: __table__Schema,
   }
   ```

2. **`src/services/mock/tables.ts`** — 註冊 mock CSV（後端接上後整個 `mock/` 資料夾會刪掉）：
   ```ts
   import __table__Csv from '../../../mock/__table__-test.csv?raw'

   export const mockCsv: Partial<Record<TableKey, string>> = {
     __table__: __table__Csv,
   }
   ```

3. **`mock/__table__-test.csv`** — 新建。第一列是 Sheet 表頭（中文），要跟 schema 的 `sheetHeader`／`label` 對得起來，並且包含 `idColumn` 那一欄。

4. **`src/config/navigation.ts`** — 要進導覽列才加：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### 跨表關聯

在 schema 欄位標 `{ type: 'ref', refTable: '另一張表' }` 就完成了，**不用**另外註冊關聯——`schema/relations.ts` 會自動掃出關聯圖。標好之後：

- `DataDetail` 自動把該欄位變成連到對方 detail 頁的連結
- `useRelatedRows('子表', '父表')` 可以用，欄位名自動解析

---

## 2. UI 元件

`components/` 底下每個元件一份，內容是「最小可用寫法 + 全部 props」。需要哪個就翻哪個，複製最小寫法貼進頁面再往上加。

| 元件 | 用途 |
| --- | --- |
| `DataList` | 卡片式列表的單列（含長按多選） |
| `GroupedList` | 多層可收合分組 |
| `DataTable` | 表格式列表／detail 頁內嵌子表格 |
| `DataDetail` | 整頁 detail 欄位渲染（含 loading/error） |
| `DetailField` | 單一欄位顯示 |
| `DataForm` | 依型別自動選輸入元件的表單 |
| `ListField` | `DataList` 內部的兩列排版（單獨用得到才碰） |
| `PageFab` | 右下角浮動按鈕 |
| `TabBar` | 頁籤篩選 |
| `AppDialog` | 對話框外殼 |
| `ConfirmDialog` | 是/否確認框（建立在 `AppDialog` 上） |

`AppShell` 是 App 層級的外殼，`App.vue` 用一次就好，不會在頁面裡重複使用，所以沒有範本。

---

## 3. Composables 速查

頁面會用到的資料存取與狀態，都在 `src/composables/`：

```ts
// 路由
useRouteId()                                    // [id] 頁面取 id 用這個，不要自己讀 route.params.id

// 讀取
useTableList<Row>(table)                        // 整表（共用快取），{ data, loading, error, refresh }
useSortedTableList<Row>(table, schema)          // 上者 + schema.defaultSort 排序；列表頁預設用這個
useTableRow<Row>(table, id)                     // 單筆，{ row, loading, error, refresh }
useRelatedRows<Row>(childTable, parentTable)    // 子表整表 + 依外鍵分組，多回傳 relatedTo(parentId)

// 表單（新增/編輯頁直接用這兩個，不用自己接 API）
useCreateForm<Row>(table, schema)               // { form, submitting, error, submit }
useEditForm<Row>(table, schema, id)             // { form, loading, loadError, submitting, error, submit }

// 動作
useNewAction(table)                             // → PageAction
useEditAction(table, row)                       // → ComputedRef<PageAction[]>
useDeleteAction(table, row)                     // → { actions, dialog, confirm }
useBulkDeleteAction(table, selectedIds, onDone) // → { actions, dialog, confirm }
useAppBarActions(() => PageAction[])            // 把動作註冊到 App Bar 右上角

// 狀態
useMultiSelect()                                // { active, clear, count, enter, isSelected, selectedIds, toggle }
```

同一張表在不同元件呼叫 `useTableList`／`useSortedTableList` 不會重複打 API——資料在 `stores/tables.ts` 共用一份。

`[id]` 頁面**一律用 `useRouteId()` 取 id**，不要寫 `String(route.params.id)`。這類頁面會被 KeepAlive 快取重用：直接讀會有兩種錯法——在 `setup` 裡讀一次會卡在第一次進入的 id（於是刪到別筆資料），寫成 getter 又會在離開頁面時跟著變 `undefined`（返回動畫期間閃「找不到這筆資料」）。`useRouteId()` 兩種都避開了。

## 4. 寫入的規矩

**不要在頁面或元件裡直接呼叫 `services/appScript.ts` 的 `mutateTable`。** 寫入一律走 `stores/tables.ts` 的四個 action：

```ts
store.create(table, values)        // → 回傳新建的那筆，並 push 進快取
store.update(table, id, values)    // → 回傳更新後那筆，並替換快取裡的那筆
store.remove(table, id)            // → 從快取移除
store.remove(table, id, beforePatch) // → 更新快取前先做別的事（見下）
store.removeMany(table, ids)       // → 逐筆刪，全部成功才一起從快取移除
```

順序固定是「先送後端 → 成功了才改快取」，失敗就讓錯誤往上拋、快取維持原狀。因為 store 會自己把快取補好，呼叫端**不需要**再手動 `refresh()`。

`remove` 的第三個參數 `beforePatch` 是給「頁面正在顯示這一筆」的情況用的：快取一被更新，這一頁的 `row` 就變 null、畫面立刻閃成「找不到這筆資料」，而返回動畫還要再跑 0.3 秒。把導覽放進 `beforePatch`，就會先離開頁面才更新快取。`useDeleteAction` 已經這樣接好了。

一般頁面用不到這四個 action——新增/編輯走 `useCreateForm`／`useEditForm`，刪除走 `useDeleteAction`／`useBulkDeleteAction`，它們內部已經接好了。
