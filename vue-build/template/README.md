# 範本（template/）

複製 → 改名 → 填空。這個資料夾**不在 `src/` 底下**，不會被 build／eslint／vue-tsc 掃到，所以裡面的檔案不用能編譯，也不會影響正式程式碼。

> 這裡只寫「怎麼用範本」。框架本身的設計與內部運作見 repo 根目錄的 [README.md](../../README.md)。

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

3. **`mock/__table__-test.csv`** — 新建。第一列是 Sheet 表頭（中文），要跟 schema 的 `sheetHeader`／`label` 對得起來，並且包含 `idColumn` 那一欄。

4. **`src/config/navigation.ts`** — 要進導覽列才加：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### schema.ts 裡要填什麼

先寫 `__Table__Row` 介面，再宣告 `__table__Schema: TableSchema<__Table__Row>`——這樣欄位 `key`、`labelColumn`、`detailOrder`、`defaultSort` 打錯字會直接紅字，`type` 跟介面的值型別對不上也會抓，虛擬欄位 `value` 的 `row` 也不用轉型。介面裡要自己補 store 會掛上去的東西：虛擬欄位的 `readonly xxx`，還有每個 ref 欄位對應的 `readonly $欄位key?: 對方Row`（`value` 裡要讀父表才需要）。

| 欄位 | 用途 |
| --- | --- |
| `sheetName` | Google Sheet 分頁的實際名稱，也是打 API 時 `table=` 的值 |
| `idColumn` | 這張表的 ID 欄，填 Sheet 的**實際表頭文字** |
| `labelColumn` | 用哪一欄稱呼一列（欄位 key，真實或虛擬都行），可省略。別的表 ref 到這裡、選擇器清單、`row.$label`（`__Table__Row` extends `RowBase` 就有型別）都顯示它；省略就是 id |
| `columns[].key` | 程式裡用的英文欄位名 |
| `columns[].label` | 顯示用的中文標籤 |
| `columns[].sheetHeader` | Sheet 的實際表頭；跟 `label` 同值時可省略 |
| `columns[].type` | `text` / `number` / `date` / `select` / `ref` |
| `columns[].options` | 只有 `type: 'select'` 要填，該欄位的可選值 |
| `columns[].allowCustom` | 只有 `type: 'select'` 有，可省略。開了 `options` 就只是建議，表單裡打別的字也直接當值、不驗證 |
| `columns[].suggestFromData` | 只有 `allowCustom` 的欄位有意義，可省略。開了建議清單會接上這張表資料裡用過、`options` 沒有的值（次數多的在前） |
| `columns[].refTable` | 只有 `type: 'ref'` 要填，指向哪張表（`schemas` 的 key） |
| `columns[].onDelete` | 只有 `type: 'ref'` 有，可省略。`'cascade'`＝對方那筆被刪時這筆也跟著刪；省略就留著 |
| `columns[].default` | 新增表單的初始值，可省略。值或函式（`() => new Date()`），函式在打開表單時才求值 |
| `columns[].required` / `min` / `max` | 內建的驗證約束，可省略。`min`／`max` 只有 number 有 |
| `columns[].validate` | 自己的規則 `(value, row) => 錯誤訊息 \| null`，可省略。內建檢查過了、而且有值時才叫；`value` 跟 `type` 同型別、`row` 是整列（跨欄位比較直接讀） |
| `columns[].searchable` | 開了才進搜尋（`text`／`ref`）或篩選抽屜（`select`／`number`／`date`），預設關。虛擬欄位也能標 |
| `virtualColumns` | 不在 Sheet 上、讀的時候才算的欄位，可省略。每個 `{ key, label, type, value: row => 值 }`，`type` 跟真實欄位一樣、決定 `value` 的回傳型別。store 會把它掛成 row 上的 getter，`row.key` 直接讀，排序、分組、顯示都跟真實欄位一樣。父表用 `row.$欄位key`、子表用 `row.$子表_欄位key`（都是 store 自動掛的，`__Table__Row` 裡宣告過型別才看得到） |
| `defaultSort` | 列表頁預設排序，多筆依序當 tiebreaker。可省略 |
| `detailOrder` | 詳細頁欄位順序。可省略，省略就沿用 `columns` 順序 |
| `formOrder` | 表單頁欄位順序。可省略，跟 `detailOrder` 分開設定 |

### 跨表關聯

在 schema 欄位標 `{ type: 'ref', refTable: '另一張表' }` 就完成了，**不用**另外註冊。標好之後這個欄位在任何地方都顯示對方的名字（對方 schema 的 `labelColumn`）、表單會變成可搜尋的選擇器（要能從詳細頁點過去，在 `fieldActions` 列一個 `useGoToRefAction`）。兩邊的列都能直接走到對方：子列 `row.$欄位key` 是父列、父列 `row.$子表_欄位key` 是子列陣列（照子表的 `defaultSort` 排），store 自動掛、關聯的表自動一起載，在 `__Table__Row` 補上型別就能用。父表那筆被刪時要連子表一起刪，在 ref 欄位加 `onDelete: 'cascade'`，刪除動作不用改。

---

## 2. UI 元件

`components/` 底下每個元件一份，內容是「最小可用寫法 + 全部 props」。需要哪個就翻哪個，複製 Usage 區塊貼進頁面再往上加。

| 元件 | 用途 |
| --- | --- |
| `DataList` | 卡片式列表的單列（含長按多選） |
| `GroupedList` | 多層可收合分組 |
| `DataTable` | 表格式列表／詳細頁內嵌子表格 |
| `DataDetail` | 整頁詳細欄位渲染（含 loading/error） |
| `DetailField` | 單一欄位顯示 |
| `DataForm` | 依型別自動選輸入元件的表單 |
| `ListField` | `DataList` 內部的兩列排版（單獨用得到才碰） |
| `PageFab` | 右下角浮動按鈕 |
| `RecordNav` | detail 頁左右兩側的上/下一筆箭頭 |
| `TabView` | 頁籤 + 內容區（切換時依頁籤順序左右滑動） |
| `AppDialog` | 對話框外殼 |
| `ConfirmDialog` | 是/否確認框 |
| `FieldsDialog` | 「問幾個欄位」對話框（通常透過 `askFields()` 用，不直接擺） |

`AppShell` 是 App 層級的外殼，`App.vue` 用一次就好，不會在頁面裡重複使用，所以沒有範本。它自帶同步鈕、確認框、問欄位對話框與 snackbar，頁面不用擺這些。

頁面的動作也不自己畫按鈕，註冊給 `AppShell` 就好，三個位置各一個 composable：

| | 用途 |
| --- | --- |
| `PageFab`（元件） | 右下角浮動按鈕，主要動作 |
| `useAppBarActions()` | App Bar 右側，次要動作；超過兩個自動收成 ⋮ |
| `useBottomActions()` | 螢幕最底端，**暫時取代導覽列**；表單的取消／送出用這個，離開頁面自動還原 |
| `DataDetail` 的 `fieldActions` | detail 頁某一欄的右邊，一欄一個、整格可點；ref 前往、開網址、改成今天都是這種 |

列表頁要搜尋列與篩選的話四行：query 與 filters 都是頁面的 ref，登記給 App Bar，再用它們過濾。哪些欄位能搜、能篩由 schema 的 `searchable` 決定（`text`／`ref` 進搜尋，`select`／`number`／`date` 進篩選抽屜）：

```ts
const query = ref('')
const filters = ref<Filters>({})
useAppBarSearch(query, { schema: __table__Schema, filters, rows: allRows })   // 放大鏡 + 搜尋欄內的篩選鈕
const data = useSearch(query, useFilter(filters, allRows, __table__Schema), __table__Schema)   // 之後 v-for / useListOrder 都用 data
```

只要搜尋不要篩選就省掉 `filters` 跟第二個參數。有頁籤的頁先篩、再搜、再依頁籤切，兩者都跨所有頁籤。抽屜是兩層的：第一層列可篩選的欄位（順序照 `detailOrder`，有條件的欄位底下用小字顯示篩什麼），點一欄進第二層填值。select 只列資料裡出現過的值。

表單頁不用自己組那兩顆按鈕——`useCreateForm`／`useEditForm` 回傳現成的 `actions`，照 `pages/new.vue`、`pages/edit.vue` 的寫法接上去就好。「有改動要不要放棄」的確認也不用管：兩個 composable 會登記到 `useLeaveGuard`，不管是按取消、返回鍵還是切導覽列都會先問。

好幾個步驟要一氣呵成（新增完直接進 detail、接著再新增另一張表）的話，用 `runFlow` + `runStep` 串起來，寫法見 `table/use__Table__Actions.ts` 末尾的註解，設計說明見 README 4.4。

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
