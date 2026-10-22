# 範本（template/）

複製 → 改名 → 填空。這個資料夾**不在 `src/` 底下**，不會被 build／eslint／vue-tsc 掃到，所以裡面的檔案不用能編譯，也不會影響正式程式碼。

> 這裡只寫**要複製哪些檔、要改哪幾處**。框架怎麼運作、有哪些選項一律看文件，每個範本檔開頭也標了該看哪一份：
>
> | 想知道 | 看哪裡 |
> | --- | --- |
> | 欄位型別、驗證、初始值、虛擬欄位、跨表關聯 | [docs/topics/schema.md](../docs/topics/schema.md) |
> | 各種頁面的外觀與用途、要決定哪些事 | [docs/design/](../docs/design/) |
> | 搜尋、篩選與排序 | [docs/topics/search.md](../docs/topics/search.md) |
> | 動作擺哪裡、內建 builder、連續動作、快速編輯對話框 | [docs/topics/actions.md](../docs/topics/actions.md) |
> | 某個元件的 props 與注意事項 | [docs/components/](../docs/components/) |
> | KeepAlive 的規則、完成動作後的導覽、離開表單前的確認 | [docs/topics/pages.md](../docs/topics/pages.md) |
> | 資料何時寫回 Sheet、推送與同步 | [docs/topics/store.md](../docs/topics/store.md) |

## 佔位字串

所有範本統一用這兩個標記當佔位符，複製後整份檔案 find-replace 就好：

| 佔位 | 換成 | 例子 |
| --- | --- | --- |
| `__table__` | 表的代稱（`schemas` 的 key、路由路徑、檔名） | `order` |
| `__Table__` | 該表的 PascalCase 前綴（型別、函式名） | `Order` |

`__Table__Row` → `OrderRow`、`__table__Schema` → `orderSchema`、`use__Table__Actions` → `useOrderActions`，兩次取代全部搞定。

複製時記得順手刪掉每個檔案開頭那段 `複製到 ...` 的註解。

---

## 0. 初次設定

拿這個框架開新專案時先改這幾處：

| 檔案 | 改什麼 |
| --- | --- |
| `src/config/app.ts` | `appName`：App 名稱，沒指定 `route.meta.title` 的頁面用它當標題<br>`authMethod`：登入方式，要跟後端對得上（見 [docs/auth.md](../../docs/auth.md)）；要改登入頁的外觀就改 `src/pages/login.vue` |
| `index.html` | `<title>` 寫同一個名字；`lang` 依介面語言 |
| `src/config/navigation.ts` | 導覽列項目，隨表增減（見下面第 1 節） |

---

## 1. 新增一張表

### 要複製的檔案

| 範本 | 複製到 | 說明 |
| --- | --- | --- |
| `table/schema.ts` | `src/schema/tables/__table__.ts` | 欄位定義、排序、顯示順序 |
| `table/use__Table__Actions.ts` | `src/composables/actions/use__Table__Actions.ts` | 該表的新增／編輯／刪除動作集合 |
| `pages/list.vue` | `src/pages/__table__/index.vue` | 列表頁 → `/__table__` |
| `pages/profile-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 profile 呈現的列表頁 |
| `pages/card-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 card 呈現的列表頁 |
| `pages/gallery-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 gallery 呈現的列表頁 |
| `pages/tab-list.vue` | `src/pages/__table__/index.vue` | **選用**：依 select 欄位（範本為 `status`）分頁籤的列表頁，各頁籤放 `_ref/list.vue` |
| `pages/_ref/list.vue` | `src/pages/__table__/_ref/__Table__List.vue` | **選用**：只供其他頁面引用的列表（不產生路由），以 `status`／`scope` 傳入條件；供 `tab-list.vue`、dashboard 或其他頁面使用 |
| `pages/detail.vue` | `src/pages/__table__/[id]/index.vue` | 詳細頁 → `/__table__/:id` |
| `pages/new.vue` | `src/pages/__table__/new.vue` | 新增表單 → `/__table__/new` |
| `pages/edit.vue` | `src/pages/__table__/[id]/edit.vue` | 編輯表單 → `/__table__/:id/edit` |
| `pages/child-list.vue` | `src/pages/__parent__/[id]/__table__.vue` | **選用**：父表詳細頁裡子表區塊的「展開」目的地 → `/__parent__/:id/__table__`。一條父子關聯一份 |
| `pages/dashboard.vue` | `src/pages/dashboard.vue`（檔名可自訂） | **選用**：同時顯示多個面板的總覽頁 → `/dashboard`。範本為父表列表、父表詳細與子表列表三個面板並開啟互動；列表使用各表的 `_ref/list.vue`。要進導覽列須另加至 `src/config/navigation.ts` |

> 路由是檔案式的（unplugin-vue-router），放進 `pages/` 就自動生效，不用維護路由表。
> 注意：同一個 `:id` 一律用 `[id]/index.vue` + `[id]/edit.vue` 的**資料夾**寫法，不要用 `[id].vue`。

### 要改的既有檔案（4 處）

1. **`src/schema/index.ts`** — 註冊 schema，`TableKey` 會自動多一個值：
   ```ts
   import { __table__Schema } from './tables/__table__'

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

3. **`mock/__table__-test.csv`** — 新建。第一列是 Sheet 表頭（對外名稱），要跟 schema 的 `sheetHeader`／`label` 對得起來，並且包含主鍵（`idColumn` 指向的那一欄）的表頭。

4. **`src/config/navigation.ts`** — 要進導覽列才加：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### 先寫 Row 介面，再宣告 schema

`TableSchema<__Table__Row>` 會拿介面去檢查：欄位 `key`、`idColumn`、`labelColumn`、`searchable`、`sortable`、`detailOrder`、`defaultSort` 打錯字直接紅字，`type` 跟值的型別對不上也會抓，虛擬欄位 `value` 的 `row` 不用轉型。介面裡要自己補 store 會掛上去的東西——虛擬欄位的 `readonly xxx`，以及每個 ref 欄位（含虛擬）的 `readonly $欄位key?: 對方Row`（`value` 裡要讀父列才需要）。

### 檢查清單

加一張表或一組頁面時逐項確認。各頁面的細節見 [docs/design/](../docs/design/README.md) 各篇的「設計時要決定的事」。

**表（schema）**
- `labelColumn`：一列以哪一欄稱呼，ref 到它的地方都顯示這一欄
- 主鍵：以 `newId` 發號，或由使用者填寫
- ref 欄位：`refTable`、刪除父列時是否連帶刪除（`onDelete`）、子列都離開時是否刪除父列（`onEmpty`）
- 虛擬欄位：數量、合計、組合的文字等
- `searchable`、`sortable`、`defaultSort`
- 條件式格式（`formatRules`）
- 後端 `Config.gs` 的分頁名稱與 ID 欄

**列表**
- 版面：deck、profile、card、gallery 或 table
- view 各位置放哪一欄：標題、副標、摘要、補充、圖片
- 分組：依哪些欄位、幾層、各組的先後
- 動作：FAB（通常為新增）、多選與批次刪除、每一列的動作
- 搜尋、篩選與排序（由 schema 的清單決定）
- 是否以頁籤分頁，頁籤的名稱
- 導覽列的入口、位置與圖示

**詳細**
- 欄位與順序（`detailOrder` 或頁面的 `order`）
- 標頭：是否使用，圖片、標題、副標、摘要與動作
- 動作：FAB（通常為編輯）、App Bar（通常為刪除），以及跨表的流程動作
- 欄位動作：前往 ref 的那一列、開啟網址、一鍵改值
- 依條件隱藏的欄位（`showIf`），例如空白時隱藏
- 快速編輯的欄位（`editable`）

**子表區塊**
- 區塊標題、空白時的文字、最多顯示幾筆、在欄位的上方或下方
- 以表格或卡片呈現，表格顯示哪些欄位
- 點一列進入的子表詳細頁
- 「新增」：預設帶入父列
- 「展開」頁：本身是一個列表，照上面列表的項目確認

**表單**
- 欄位與順序（`formOrder` 或頁面的 `order`），新增與編輯是否不同
- 各欄的型別、必填
- 主鍵在新增時是否可填，或只能由預設值帶入（`lockId`）
- 預設值：schema 的 `default`、從哪裡按新增時帶入的值
- 選項類：只能選選項或可自填（`allowCustom`）、建議清單（`suggestedValues`）
- 數字的 `min`／`max`／`step`、自訂的 `validate`
- 是否顯示唯讀的虛擬欄位（例如小計）

---

## 2. 不用自己寫的東西

新增一張表時最常「以為要自己做」的幾件，其實框架都接好了：

- **路由**：檔案即路由，不用註冊
- **跨表關聯**：schema 欄位標 `{ type: 'ref', refTable: '另一張表' }` 就完成，兩邊的列自動掛 getter、關聯的表自動一起載
- **表單**：欄位型別決定輸入元件，取消／送出與「要不要放棄」都由 `useCreateForm`／`useEditForm` 處理
- **搜尋、篩選與排序**：`useListPage(table, schema)` 一行接好，放大鏡、篩選抽屜與排序鈕自動出現（schema 的 `searchable`／`sortable` 清單決定有哪些欄位、什麼順序）
- **載入中／載入失敗／找不到資料**：版型元件（`ListPage`／`DetailPage`／`FormPage`）內建
- **確認框、問欄位對話框、snackbar**：`AppShell` 各掛一個實例，頁面直接叫 `confirm()`／`askFields()`／`notify()`
