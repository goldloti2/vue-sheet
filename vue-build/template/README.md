# 範本（template/）

複製 → 改名 → 填空。這個資料夾**不在 `src/` 底下**，不會被 build／eslint／vue-tsc 掃到，所以裡面的檔案不用能編譯，也不會影響正式程式碼。

> 這裡只寫「怎麼用範本」。框架本身的設計與內部運作見 [前端文件索引](../README.md)。

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

## 0. 初次設定

拿這個框架開新專案時先改這幾處：

| 檔案 | 改什麼 |
| --- | --- |
| `src/config/app.ts` | `appName`：App 名稱，沒指定 `route.meta.title` 的頁面用它當標題 |
| `index.html` | `<title>` 寫同一個名字（靜態 HTML 讀不到 TS，只能各寫一次）；`lang` 依介面語言 |
| `src/config/navigation.ts` | 導覽列項目，隨表增減（見下面第 1 節） |

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

3. **`mock/__table__-test.csv`** — 新建。第一列是 Sheet 表頭（對外名稱），要跟 schema 的 `sheetHeader`／`label` 對得起來，並且包含 `idColumn` 那一欄。

4. **`src/config/navigation.ts`** — 要進導覽列才加：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### schema.ts 裡要填什麼

先寫 `__Table__Row` 介面，再宣告 `__table__Schema: TableSchema<__Table__Row>`——這樣欄位 `key`、`labelColumn`、`detailOrder`、`defaultSort` 打錯字會直接紅字，`type` 跟介面的值型別對不上也會抓，虛擬欄位 `value` 的 `row` 也不用轉型。介面裡要自己補 store 會掛上去的東西：虛擬欄位的 `readonly xxx`，還有每個 ref 欄位對應的 `readonly $欄位key?: 對方Row`（`value` 裡要讀父表才需要）。

完整的欄位清單不在這裡：每個欄位的意思寫在 [`src/schema/types.ts`](../src/schema/types.ts) 的型別上。常用的幾個：

| 欄位 | 用途 |
| --- | --- |
| `sheetName`、`idColumn`、`newId` | 對應哪個 Sheet 分頁、ID 欄的實際表頭、怎麼發新 id（`prefixedId('TPL')`） |
| `columns[]` | Sheet 上真的有的欄位：`key`／`label`／`type`，加上該型別專屬的設定（`options`、`refTable`…） |
| `labelColumn` | 用哪一欄稱呼一列；別的表 ref 到這裡就顯示它 |
| `virtualColumns[]` | 算出來的欄位，多一個 `value: row => 值` |
| `defaultSort`、`detailOrder`、`formOrder` | 列表排序、詳細頁順序、表單順序 |

設計上為什麼是這樣（虛擬欄位、跨表關聯、驗證的分工）見 [docs/schema.md](../docs/schema.md)。

### 跨表關聯

在 schema 欄位標 `{ type: 'ref', refTable: '另一張表' }` 就完成了，**不用**另外註冊。標好之後這個欄位在任何地方都顯示對方的名字（對方 schema 的 `labelColumn`）、表單會變成可搜尋的選擇器（要能從詳細頁點過去，在 `fieldActions` 列一個 `useGoToRefAction`）。兩邊的列都能直接走到對方：子列 `row.$欄位key` 是父列、父列 `row.$子表_欄位key` 是子列陣列（照子表的 `defaultSort` 排），store 自動掛、關聯的表自動一起載，在 `__Table__Row` 補上型別就能用。父表那筆被刪時要連子表一起刪，在 ref 欄位加 `onDelete: 'cascade'`，刪除動作不用改。

---

## 2. UI 元件

每個元件的用法（最小可用寫法 + 全部 props + 注意事項）在 [docs/components/](../docs/components/)，一個元件一份；有哪些元件、各自負責什麼見 [docs/architecture.md](../docs/architecture.md) 的模組結構。

`AppShell` 是 App 層級的外殼，`App.vue` 用一次就好，不會在頁面裡重複使用，所以沒有範本。它自帶同步鈕、確認框、問欄位對話框與 snackbar，頁面不用擺這些。

頁面的動作也不自己畫按鈕，註冊給 `AppShell` 就好，三個位置各一個 composable：

| | 用途 |
| --- | --- |
| `PageFab`（元件） | 右下角浮動按鈕，主要動作 |
| `useAppBarActions()` | App Bar 右側，次要動作；超過兩個自動收成 ⋮ |
| `useBottomActions()` | 螢幕最底端，**暫時取代導覽列**；表單的取消／送出用這個，離開頁面自動還原 |
| `DataDetail` 的 `fieldActions` | detail 頁某一欄的右邊，一欄一個、整格可點；ref 前往、開網址、改成今天都是這種 |

列表頁要搜尋列與篩選的話四行：query 與 filters 都是頁面的 ref，登記給 App Bar，再用它們過濾。哪些欄位能搜、能篩由 schema 的 `searchable` 決定（`text`／`ref` 進搜尋，`select`／`number`／`date`／`duration` 進篩選抽屜）：

```ts
const query = ref('')
const filters = ref<Filters>({})
useAppBarSearch(query, { schema: __table__Schema, filters, rows: allRows })   // 放大鏡 + 搜尋欄內的篩選鈕
const data = useSearch(query, useFilter(filters, allRows, __table__Schema), __table__Schema)   // 之後 v-for / useListOrder 都用 data
```

只要搜尋不要篩選就省掉 `filters` 跟第二個參數。有頁籤的頁先篩、再搜、再依頁籤切，兩者都跨所有頁籤。抽屜是兩層的：第一層列可篩選的欄位（順序照 `detailOrder`，有條件的欄位底下用小字顯示篩什麼），點一欄進第二層填值。select 只列資料裡出現過的值。

表單頁不用自己組那兩顆按鈕——`useCreateForm`／`useEditForm` 回傳現成的 `actions`，照 `pages/new.vue`、`pages/edit.vue` 的寫法接上去就好。「有改動要不要放棄」的確認也不用管：兩個 composable 會登記到 `useLeaveGuard`，不管是按取消、返回鍵還是切導覽列都會先問。

好幾個步驟要一氣呵成（新增完直接進 detail、接著再新增另一張表）的話，用 `runFlow` + `runStep` 串起來，寫法見 `table/use__Table__Actions.ts` 末尾的註解，設計說明見 [docs/architecture.md](../docs/architecture.md)。

只想改一兩個欄位、不值得開整頁表單的動作（改狀態、補日期），用 `useQuickEditAction`：多選模式下出現，開一個小對話框問那幾欄，確定後選取的每一筆都改成同一個值。只選一筆時對話框顯示那筆的現值，否則用 `defaults`：

```ts
setStatus: selectedIds
  ? useQuickEditAction<__Table__Row>(TABLE, ['status'], selectedIds, {
      label: '改狀態',
      icon: mdiTag,
      defaults: { status: '選項A' },   // 值或函式都行，可省略
      onDone,                          // 跟 bulkDelete 共用的那個 option
    })
  : none,
```

只是要問是／否的話用 `confirm(title, text)`（`@/composables/shell/useConfirm`），回 `Promise<boolean>`；動作上宣告 `confirm: { title, text }` 就是它的語法糖。

`useQuickEditAction` 底下就是 `askFields()`——要自己組的話（例如當流程的一步）直接叫，取消回 `null`：

```ts
import { askFields } from '@/composables/shell/useAskFields'

const values = await askFields<__Table__Row>(schema, ['status'], { rows: [current] })
if (values) {
  store.update(TABLE, current.id, values)
}
```

- 第三個參數可選：`title`（省略就用欄位 label 串起來）、`rows`（要改的那幾筆，剛好一筆時拿現值當初始值）、`defaults`（沒有現值時的初始值，值或函式都行）
- 只驗證問到的欄位；輸入元件與錯誤顯示跟整頁表單一樣
- 換頁會把它關掉並回 `null`，所以在流程裡當一步用也安全

要跳一則短訊息（成功、失敗、已刪除之類的）就直接叫 `notify()`，不需要在頁面上放任何元件：

```ts
import { notify } from '@/composables/shell/useNotify'

notify('已推送')
notify('推送失敗', 'error')   // 第二個參數是 Vuetify 的 color
```
