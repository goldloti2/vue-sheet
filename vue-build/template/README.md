# 範本（template/）

使用方式為：複製、改名、填空。此資料夾**不在 `src/` 中**，build、eslint 與 vue-tsc 皆不掃描。因此其中的檔案無須能編譯，也不影響正式的程式。

> 此文件只寫**要複製哪些檔案、要修改哪幾處**。框架的運作方式與選項一律見文件，每個範本檔的開頭也標示了應閱讀的文件：
>
> | 要了解的事 | 文件 |
> | --- | --- |
> | 欄位型別、驗證、初始值、虛擬欄位、跨表關聯 | [docs/topics/schema.md](../docs/topics/schema.md) |
> | 各種頁面的外觀與用途、須決定的事 | [docs/design/](../docs/design/) |
> | 搜尋、篩選與排序 | [docs/topics/search.md](../docs/topics/search.md) |
> | 動作的位置、內建 builder、連續動作、快速編輯對話框 | [docs/topics/actions.md](../docs/topics/actions.md) |
> | 某個元件的 props 與注意事項 | [docs/components/](../docs/components/) |
> | KeepAlive 的規則、完成動作後的導覽、離開表單前的確認 | [docs/topics/pages.md](../docs/topics/pages.md) |
> | 資料寫回 Sheet 的時機、推送與同步 | [docs/topics/store.md](../docs/topics/store.md) |

## 佔位字串

所有範本統一以下列兩個標記作為佔位字串。複製後，對整個檔案執行尋找與取代即可：

| 佔位字串 | 換成 | 例子 |
| --- | --- | --- |
| `__table__` | 表的代稱（`schemas` 的 key、路由路徑、檔名） | `order` |
| `__Table__` | 該表的 PascalCase 前綴（型別、函數名稱） | `Order` |

取代兩次即全部完成，例如 `__Table__Row` → `OrderRow`、`__table__Schema` → `orderSchema`、`use__Table__Actions` → `useOrderActions`。

複製時，刪除每個檔案開頭那段「複製到 ...」的註解。

---

## 0. 初次設定

以此框架建立新專案時，先修改下列幾處：

| 檔案 | 修改的內容 |
| --- | --- |
| `src/config/app.ts` | `appName`：App 名稱，未指定 `route.meta.title` 的頁面以此作為標題。網頁的 `<title>` 與安裝後的名稱也使用此名稱<br>`authMethod`：登入方式，須與後端相符（見 [docs/auth.md](../../docs/auth.md)）。登入頁的外觀見 `src/pages/login.vue`<br>`detailFieldLayout`：詳細頁欄位的排法，`'side'`（標籤與值左右並排）或 `'stacked'`（上下兩行）。單一頁面以 `DetailPage` 的 `layout` 覆寫<br>`autoPushDelay`：計時推送的秒數，`null` 為不啟用（見 [docs/topics/store.md](../docs/topics/store.md)） |
| `index.html` | `lang` 依介面的語言 |
| `public/icons/` | 以專案的圖示取代下列檔案，檔名不變：<br>・`favicon.ico`：瀏覽器分頁的圖示，含 16、32、48 px<br>・`apple-touch-icon.png`：iOS 主畫面的圖示，180 px，背景不透明<br>・`icon-192.png`、`icon-512.png`：安裝後的圖示，背景可為透明<br>・`icon-maskable-512.png`：Android 會依裝置裁成圓形或其他形狀。背景不透明，圖案須位於中心 40% 半徑的範圍內<br>・`NOTICE.txt`：圖示的來源與授權。替換圖示時一併改寫<br>build 時，`NOTICE.txt`、打包的各套件的授權檔，以及 `licenses/` 中對應授權的全文，彙整為網站的 `THIRD-PARTY-NOTICES.txt`。新的圖示的授權不在 `licenses/` 中時，加入該授權的全文 |
| `src/config/navigation.ts` | 底部導覽列與側邊欄的項目，隨表增減（見下方第 1 節） |

---

## 1. 新增一張表

### 要複製的檔案

| 範本 | 複製到 | 說明 |
| --- | --- | --- |
| `table/schema.ts` | `src/schema/tables/__table__.ts` | 欄位定義、排序、顯示順序 |
| `table/use__Table__Actions.ts` | `src/composables/actions/use__Table__Actions.ts` | 該表的新增、編輯、刪除等動作 |
| `pages/list.vue` | `src/pages/__table__/index.vue` | 列表頁 → `/__table__` |
| `pages/profile-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 profile 呈現的列表頁 |
| `pages/card-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 card 呈現的列表頁 |
| `pages/gallery-list.vue` | `src/pages/__table__/index.vue` | **選用**：以 gallery 呈現的列表頁 |
| `pages/tab-list.vue` | `src/pages/__table__/index.vue` | **選用**：依 select 欄位（範本為 `status`）分頁籤的列表頁，各頁籤放 `_ref/list.vue` |
| `pages/_ref/list.vue` | `src/pages/__table__/_ref/__Table__List.vue` | **選用**：只供其他頁面引用的列表，不產生路由。以 `status` 或 `scope` 傳入條件，供 `tab-list.vue`、dashboard 或其他頁面使用 |
| `pages/detail.vue` | `src/pages/__table__/[id]/index.vue` | 詳細頁 → `/__table__/:id` |
| `pages/child-list.vue` | `src/pages/__parent__/[id]/__table__.vue` | **選用**：父表詳細頁中子表區塊的「展開」頁 → `/__parent__/:id/__table__`。一條父子關聯一個檔案 |
| `pages/dashboard.vue` | `src/pages/dashboard.vue`（檔名可自訂） | **選用**：同時顯示多個面板的總覽頁 → `/dashboard`。<br>・範本為父表列表、父表詳細與子表列表三個面板，並以 `useDashboardLinks()` 接線<br>・列表使用各表的 `_ref/list.vue`<br>・須加入底部導覽列或側邊欄時，另外加至 `src/config/navigation.ts` |
| `pages/chart.vue` | `src/pages/__table__-chart.vue`（檔名可自訂） | **選用**：一張圖表的頁面 → `/__table__-chart`。<br>・範本為各狀態的列數與金額的總和，長條加折線<br>・也可改為 `_ref/` 中的元件，置於 dashboard 的面板或頁籤頁的頁籤<br>・須加入底部導覽列或側邊欄時，另外加至 `src/config/navigation.ts` |

> 路由為檔案式（unplugin-vue-router），檔案放進 `pages/` 即自動生效，無須維護路由表。
>
> 注意：同一個 `:id` 一律使用 `[id]/index.vue` 的**資料夾**寫法，不使用 `[id].vue`。
>
> 新增與編輯的表單無須複製檔案：`newAction`、`editAction` 依 schema 開啟（見 [docs/topics/pages.md](../docs/topics/pages.md#表單層)）。

### 要修改的既有檔案（4 處）

1. **`src/schema/index.ts`**：註冊 schema，`TableKey` 即自動多一個值：
   ```ts
   import { __table__Schema } from './tables/__table__'

   export const schemas = {
     __table__: __table__Schema,
   }
   ```

2. **`src/services/mock/tables.ts`**：註冊 mock CSV。後端接上後，整個 `mock/` 資料夾刪除：
   ```ts
   import __table__Csv from '../../../mock/__table__-test.csv?raw'

   export const mockCsv: Partial<Record<TableKey, string>> = {
     __table__: __table__Csv,
   }
   ```

3. **`mock/__table__-test.csv`**：新建檔案。
   - 第一列為 Sheet 的表頭（對外的名稱），須與 schema 的 `sheetHeader` 或 `label` 相符
   - 須包含主鍵欄（`idColumn` 指向的欄位）的表頭

4. **`src/config/navigation.ts`**：須加入導覽時才修改。`navItems` 為底部導覽列，最多 5 項。`drawerSections` 為側邊欄，依組列出。有 `title` 的組可展開與收合，`icon` 選填。兩處的項目寫法相同：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### 先寫 Row 介面，再宣告 schema

`TableSchema<__Table__Row>` 以介面檢查 schema：
- 欄位的 `key`、`idColumn`、`labelColumn`、`searchable`、`sortable`、`detailOrder`、`defaultSort` 打錯時，直接顯示錯誤
- `type` 與值的型別不符時，也會檢查出來
- 虛擬欄位 `value` 的 `row` 無須轉型

介面中須自行補上 store 掛上的屬性：
- 虛擬欄位的 `readonly xxx`
- 每個 ref 欄位（包括虛擬的 ref）的 `readonly $欄位key?: 對方Row`。只有 `value` 中須讀取父列時才需要

### 檢查清單

新增一張表或一組頁面時，逐項確認。各頁面的細節見 [docs/design/](../docs/design/README.md) 各篇的「設計時須決定的事」。

**表（schema）**
- `labelColumn`：以哪一欄稱呼一列。ref 到這張表的地方都顯示這一欄
- 主鍵：以 `newId` 發號，或由使用者填寫
- ref 欄位：`refTable`、刪除父列時是否連帶刪除（`onDelete`）、子列都離開時是否刪除父列（`onEmpty`）、選擇器的順序是否與父表的 `defaultSort` 不同（`refSort`）、選擇器中是否可以新增父列（`allowCreate`）
- 虛擬欄位：數量、合計、組合的文字等
- `searchable`、`sortable`、`defaultSort`
- 條件式格式（`formatRules`）
- 後端 `Config.gs` 的分頁名稱與 ID 欄

**列表**
- 版面：deck、profile、card、gallery 或 table
- view 各位置放置的欄位：標題、副標、摘要、補充、圖片
- 分組：依哪些欄位、分幾層、各組的先後
- 動作：FAB（通常為新增）、多選與刪除選取的列、每一列的動作
- 搜尋、篩選與排序，由 schema 的清單決定
- 是否以頁籤分頁，以及頁籤的名稱
- 底部導覽列或側邊欄的入口、位置與圖示

**詳細**
- 欄位與順序（`detailOrder` 或頁面的 `order`）
- 標頭：是否使用。使用時的圖片、標題、副標、摘要與動作
- 動作：FAB（通常為編輯）、App Bar（通常為刪除），以及跨表的流程動作
- 欄位動作：前往 ref 的父列、開啟網址、一鍵改值
- 依條件隱藏的欄位（`showIf`），例如空白時隱藏
- 快速編輯的欄位（`editable`）

**子表區塊**
- 區塊的標題、沒有子列時的文字、最多顯示幾列、在欄位的上方或下方
- 以表格或卡片呈現，表格顯示哪些欄位
- 點擊一列時進入的子表詳細頁
- 「新增」：預設帶入父列
- 「展開」頁：本身是一個列表，依上方列表的項目確認

**表單**
- 欄位與順序（`formOrder` 或頁面的 `order`），新增與編輯是否不同
- 各欄的型別、必填
- 主鍵在新增時可否填寫，或只能由預設值帶入（`lockId`）
- 預設值：schema 的 `default`，以及從各處按新增時帶入的值
- 選項類：只能選擇選項，或可自行填寫（`allowCustom`）。建議清單（`suggestedValues`）
- 文字是否為長文（`multiline`），可換行並使用多行的輸入框
- 數字的 `min`、`max`、`step`，自訂的 `validate`
- 是否顯示唯讀的虛擬欄位，例如小計

---

## 2. 無須自行撰寫的部分

新增一張表時，以下幾件常被誤以為須自行實作，框架其實都已接好：

- **路由**：檔案即路由，無須註冊
- **跨表關聯**：schema 欄位標示 `{ type: 'ref', refTable: '另一張表' }` 即完成。兩邊的列自動掛上 getter，關聯的表自動一起載入
- **表單**：無須頁面檔。欄位型別決定輸入元件。取消、送出與「是否放棄變更」皆由表單層處理
- **搜尋、篩選與排序**：`useListPage(table, schema)` 一行即接好。放大鏡、篩選抽屜與排序按鈕自動出現，schema 的 `searchable`、`sortable` 清單決定有哪些欄位與順序
- **載入中、載入失敗、找不到資料**：版型元件（`ListPage`、`DetailPage`）與表單層內建
- **確認框、snackbar**：`AppShell` 各掛一個實例，頁面直接呼叫 `confirm()`、`notify()`
- **表單與詢問欄位的對話框**：`AppShell` 掛載 `FormLayerHost`，頁面直接呼叫 `openForm()`、`askFields()`
