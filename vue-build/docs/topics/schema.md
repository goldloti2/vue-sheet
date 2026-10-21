# 資料表與 Schema

一張表要怎麼描述給框架看：欄位、關聯、驗證、預設值。

> **前置**：讀這份之前不用先讀別的。實際新增一張表的步驟見 [template/README.md](../../template/README.md)；每個欄位的完整說明寫在 [`src/schema/types.ts`](../../src/schema/types.ts) 的型別上（游標停在欄位名就會跳出來）。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 怎麼用

一張表 = 一個 Row 介面 + 一個 schema 物件。

> 下面是用來**看**的例子。要複製的骨架在 [template/table/schema.ts](../../template/table/schema.ts)。

```ts
// src/schema/tables/order.ts
export interface OrderRow extends RowBase {
  code: string | null
  title: string | null
  amount: number | null
  orderedAt: Date | null
  // 虛擬欄位與 store 掛的 getter 要自己宣告型別
  readonly withTax: number | null
}

export const orderSchema: TableSchema<OrderRow> = {
  tableLabel: '訂單',           // 畫面上怎麼顯示這張表
  idColumn: 'code',             // 主鍵是哪一欄
  newId: prefixedId('ORD'),     // 主鍵留空時怎麼發號
  labelColumn: 'title',         // 別的表 ref 到這裡時顯示哪一欄
  columns: [
    { key: 'code', label: '訂單編號', type: 'text' },
    { key: 'title', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'orderedAt', label: '下單日期', type: 'date' },
  ],
  virtualColumns: [
    { key: 'withTax', label: '含稅', type: 'number', value: row => row.amount === null ? null : row.amount * 1.05 },
  ],
  // 能搜尋／篩選與能排序的欄位，順序就是抽屜與排序面板上的順序
  searchable: ['title', 'orderedAt', 'amount'],
  sortable: ['orderedAt', 'amount'],
  defaultSort: [{ key: 'orderedAt', direction: 'desc' }],
}
```

以 `TableSchema<OrderRow>` 宣告時，`key`、`idColumn`、`labelColumn`、`searchable`、`sortable`、`detailOrder`、`defaultSort` 只能填 Row 有的欄位名（`idColumn` 另限值為字串的欄位），`type` 要跟 Row 那個欄位的值型別相符，虛擬欄位 `value` 的 `row` 也直接是 `OrderRow`。

最後在 `src/schema/index.ts` 註冊，`TableKey` 就自動多一個值。

---

## Sheet 上的慣例

- **一個 Sheet 分頁 = 一張表**
- **每張表有一欄唯一的主鍵**（通常是第一欄，見下方「主鍵」），不以 row number 作為主鍵
- **ID 同時是跨表關聯的外鍵**
- **表頭用對外名稱**，使用者看得懂的那個名字

欄位因此有兩個名字：程式裡用的 `key`（英文），和 Sheet 上給人看的 `sheetHeader`。畫面上的 `label` 通常就是同一個對外名稱，所以 `sheetHeader` 省略時自動用 `label`；只有「Sheet 上的表頭跟畫面上想顯示的不一樣」時才需要分開寫，例如畫面顯示「名稱」、Sheet 的表頭是「訂單名稱」時，另外加上 `sheetHeader: '訂單名稱'`。

**寫回 Sheet 前，`serializeRow` 會幫一部分的值補上單引號**：寫進去的字串會被 Sheet 當成「使用者在那一格輸入」解析，有幾種形狀會讓那一格變成別的型別。只有這幾種補，其他值原樣送出；單引號是 Sheet 的純文字前綴，不算內容，讀回來時不含它。

| 值長這樣 | 不補的話 |
| --- | --- |
| `=` 或 `+` 開頭 | 變公式或算式 |
| `0` 開頭 | 被當成數字，前導零消失（`0912` 變 `912`） |
| `1/2`、`2021/03/01` | 變日期 |
| `1E5` | 變數字 `100000` |

只有 `text`／`select`／`image` 這三種型別會做這件事：

- `number`、`date`、`duration`、`boolean` 不補
- **`ref` 不補，主鍵也不會被補**：主鍵不以數字或 `=`、`+`、`-`、`'` 開頭，也不含 `/`（見下方「主鍵」），不會符合上表的任一種形狀

補單引號由前端處理，後端不參與。

---

## 主鍵

`idColumn` 指向 `columns` 中的一欄，該欄的值即為 `row.id`；store、路由與跨表關聯皆以 `row.id` 運作。主鍵須為值是字串的欄位（`text`、`ref`、`select` 等），型別不符時 TS 會擋下。

- **新增**：該欄有值即作為 id；空的才以 `newId()` 發號並填回該欄。省略 `newId` 時主鍵必填
- **新增表單是否出現主鍵**依這一頁實際使用的順序（頁面的 `order`，否則為 `formOrder`；兩者皆省略時所有欄位皆出現）：沒排進去時一律發號；排進去則可自行輸入，有 `newId` 時欄位下方提示「留空即自動產生」
- **不能重複**：新增時 id 已存在即拋錯；剛被刪除、尚未推送的 id 亦不能再用
- **建立後不能修改**：編輯表單，以及有給 `rows` 的 `askFields`（含 `quickEditAction`）中，主鍵那一欄為唯讀；不經過表單的修改由 store 的 `update` 拋錯擋下
- **格式**：`prefixedId('ORD')` 這種前綴式即符合
  - 不以數字或 `=`、`+`、`-`、`'` 開頭
  - 只能使用英文字母、數字與 `-`、`_`、`.`、`!`、`~`、`*`、`'`、`(`、`)`，即 `encodeURIComponent` 不會改變的字元；中文與空白都不行
  - 不能是 `.` 或 `..`
- **主鍵可以是 `ref`**：例如與父表共用 id 的一對一延伸表，新增時於表單上選父列，id 即等於父列的 id。關聯、`row.$欄位key` 與連帶刪除皆與其他 ref 欄位相同

---

## 欄位

- **真實欄位**（`columns`）：Sheet 上真的有的，可編輯
- **虛擬欄位**（`virtualColumns`）：不存在 Sheet 上、讀的時候才算。來源可以是這一列自己（價格加手續費），也可以是子表（父表用第一筆子列的名字當標題、子表金額加總）

虛擬欄位除了不能編輯，其他都跟真實欄位一樣：顯示、排序、分組，也照樣能列進 `searchable`／`sortable`／`defaultSort`／`detailOrder`。它與 `columns` 分開放，`coerceRow`／`serializeRow` 與送出的值皆不處理它。

排進 `formOrder` 時，虛擬欄位於表單中唯讀顯示，隨輸入即時重算；讀父列（`row.$欄位key`）的也算得出來。新增表單的 id 仍是空的，讀子列（`row.$子表_欄位key`）的在新增時一律沒有子列。

虛擬欄位也可以是 `ref`，`value` 回傳對方的 id，用於經由另一筆父列取得的多層關聯。store 同樣掛上 `row.$欄位key`，顯示、排序與搜尋皆以對方的名稱呈現，對方的表亦一起載入。它不進關聯圖：對方沒有 `$子表_欄位key`，不能設 `onDelete`，也不能作為 dashboard 的 `via`。

型別有 `text`／`number`／`date`／`duration`／`boolean`／`select`／`ref`／`image` 八種，每種有自己的專屬設定（`number` 的 `min`／`max`／`step`、`select` 的 `options`、`ref` 的 `refTable`…）。完整清單見 [`types.ts`](../../src/schema/types.ts)。

`number` 的 `step` 是表單上 −／＋ 每次的增減，預設為 1；輸入的值不受它限制，例如 `step: 0.5` 時仍可輸入 1.3。表單不限制小數位數，輸入的值不會被四捨五入。

### date 與 duration

- **`date` 只有日期**：讀進來時歸零到當天午夜
- **`duration` 是一段長度、不是時間點**：值是 `"時:分:秒"` 字串（分秒各兩位、**時數不設上限**），`2:30:00` 是兩個半小時、`30:15:45` 也合法
- 讀進來時容忍 `H:mm`（秒補 `00`）與 `H:mm:ss`；分或秒超過 59、格式不對就當空的
- 表單是一般文字框，填錯格式會被驗證擋下來
- 排序與篩選都換算成秒再比；篩選是**範圍**（最短／最長）
- 🔲 **沒有「幾點幾分」的型別**。需要時間點時另外新增，不以 `duration` 代替

### boolean 欄位

- **值為 `true`、`false` 或空（`null`）**：Sheet 上為 `TRUE`、`FALSE` 或空的儲存格，空的就是空，不當成否
- **讀取時不分大小寫**，前後的空白亦忽略；`TRUE`、`FALSE` 以外的值（例如手動填入的 `是`、`1`）一律視為空。這樣的列經表單儲存後，該格會被寫成空
- **Sheet 上不使用核取方塊**：核取方塊只有勾與不勾，無法留空
- **寫回時**寫 `TRUE`、`FALSE`，空的寫空字串
- **顯示為「是」「否」**，空的不顯示
- **表單**是「否」「是」兩顆互斥的按鈕，再按一次已選的那顆即清空
- **篩選**勾選是、否或「(空白)」；**排序**否在前、是在後，空的排最後
- **不進搜尋列**，列進 `searchable` 時歸篩選抽屜

### image 欄位

一格一張圖，值仍然是一個字串，**來源看內容決定**：

| 值長這樣 | 當成 |
| --- | --- |
| `<svg …` | 行內 SVG |
| `https://drive.google.com/…/d/<id>/…` 或 `?id=<id>` | Drive 分享連結，取出 id |
| 其他 `http(s)://…` | 圖片網址 |
| 其餘 | Drive 檔案 id |

顯示時一律用 `imageSrc(value)`（`schema/image.ts`）轉成 `<img src>`：Drive 走 `https://drive.google.com/thumbnail?id=<id>&sz=w<寬>`，SVG 轉成 `data:image/svg+xml,`。

- **詳細頁自動顯示圖片**（`DataDetail` → `DetailField`），不用多做什麼
- **列表縮圖於 view 中指定**：`defineView(schema, { image: 'photo', … })`，由 view 轉換為 src，`DataList` 顯示為縮圖、`DataProfile` 顯示為圓形頭像，`DataCard` 依所在的組顯示為頭像或大圖，`DataGallery` 顯示為正方形圖片；未指定則不顯示（`DataGallery` 以灰色方塊佔位）（見 [DataList](../components/list/DataList.md)、[DataProfile](../components/list/DataProfile.md)、[DataCard](../components/list/DataCard.md)、[DataGallery](../components/list/DataGallery.md)）
- **表單就是純文字欄位**：貼網址、Drive 連結或整段 SVG。上傳到 Drive 還沒做
- **不進搜尋與篩選**

---

## 欄位呈現與其順序

哪些欄位會出現在各個畫面、以什麼順序，寫在表的層級，用 key 的清單表示：

| 清單 | 決定什麼 |
| --- | --- |
| `searchable` | 哪些欄位進搜尋列（`text`／`ref`）或篩選抽屜（其餘型別）。**順序就是抽屜第一層的順序** |
| `sortable` | 哪些欄位進排序面板（`image` 列了也會跳過）。**順序就是面板上的順序** |
| `detailOrder`／`formOrder` | 詳細頁與表單頁的欄位順序，沒列到的欄位詳細頁不顯示；`formOrder` 中的虛擬欄位為唯讀 |
| `defaultSort` | 列表的預設排序，多筆依序當 tiebreaker |

四份都可省略，省略就是「沒有」（`detailOrder`／`formOrder` 例外，它們省略時沿用 `columns` 的順序）。key 打錯字 TS 會擋下來——型別是 `RowKey<Row>[]`，跟 Row 介面對答案。

`detailOrder`／`formOrder` 是這張表的預設。個別頁面要不同的欄位或順序時（例如新增頁要填主鍵、編輯頁不顯示），以 `DetailPage`／`FormPage` 的 `order` prop 覆寫，只影響那一頁（見 [DetailPage](../components/page/DetailPage.md)、[FormPage](../components/page/FormPage.md)）。

### 依條件顯示

真實與虛擬欄位皆可加上 `showIf: row => boolean`，回傳 `false` 時詳細頁不顯示該欄（連名稱一起拿掉）。`row` 與虛擬欄位的 `value` 相同，可讀虛擬欄位與 `$欄位key` 等 getter。

- **只作用於詳細頁**：表單、列表的 view、表格皆不受影響
- **row 尚未載入時一律顯示**，與沒有 `showIf` 的欄位相同

---

## row 上的 getter

store 在產生每一列時掛上這些，讀起來跟真實欄位沒有差別：

```ts
row.withTax        // 虛擬欄位
row.$label         // 這一列的名字（labelColumn 指定哪一欄，省略就是 id）
row.$parentKey     // ref 欄位指到的那一列（父列）
row.$child_parent  // 指向這一列的子列陣列
```

- **排序、分組、顯示都能直接用**，`sortRows`、`formatColumnValue`、列表頁的 `row.xxx` 都不必知道它是算出來的
- **不可列舉**：`{ ...row }`、`Object.keys`、`JSON.stringify` 都看不到
- **會自動更新**：getter 讀的是 store 快取，在 template 或 `computed` 裡讀就會被追蹤，子表一改當場重算
- **子表還沒載入時是空陣列**，載進來後自動重算
- **子列陣列不要就地改**（`sort`／`push`）：回傳的是索引裡的同一份
- **兩個方向都走索引**：父列是「id → 列」、子列是「父 id → 子列」，兩份都是 `computed`（`rowGetters.ts`），依賴對方那張表、所以會自己失效。每讀一次 getter 是一次查表，不是掃整張表

---

## 跨表關聯

外鍵放在「多」的那一方。標一個欄位就完成，不用另外註冊：

```ts
{ key: 'parent', label: '所屬', type: 'ref', refTable: 'parentTable' }
```

`schema/relations.ts` 會掃過所有 schema 自動算出關聯圖。標好之後：

- **顯示**：任何地方都顯示對方的名字（對方 schema 的 `labelColumn`），不是 id
- **表單**：`DataForm` 做成可搜尋的下拉清單（`v-autocomplete`），對方整張表載進共用快取
- **從詳細頁點過去**：在 `fieldActions` 列一個 `goToRefAction`
- **兩邊都走得到**：子列用 `row.$欄位key`、父列用 `row.$子表_欄位key`（照子表的 `defaultSort` 排）
- **不驗證目標存不存在**：選擇器只選得到現有的列

### 「一」的那一方不存清單

Sheet 上的真相只有子表的 ref 欄位一份，父列上的陣列是讀的時候算出來的。框架也沒有清單型別的欄位。

不過 **ref 的方向沒有限制**：父表可以加一個 ref 指向**某一筆特定的**子列（例如「代表項目」），兩張表就互為對方的父／子。代價是載入時互相需要（`ensureLoaded` 的 `seen` 擋掉循環），而且兩邊都標 cascade 前要想清楚刪除會連到哪裡。

### 子列 getter 的命名

`$子表代稱_ref欄位key`（例如 `$child_parent`），不需設定。同一張子表有兩個 ref 指向同一張父表時，兩條關聯各有各的名字。

### 連帶刪除

在 ref 欄位加 `onDelete: 'cascade'`，父列被刪時指向它的子列一起刪，多層遞迴。刪除動作不用改。

- 走的是同一條 `patch` + `enqueue`，所以佇列合併、流程存檔點與回滾都自動涵蓋，**後端不用知道這件事**
- 不標就維持原狀：子列留著、ref 指向不存在的 id（顯示退回 id）
- 子表必須在快取裡才找得到子列——`ensureLoaded` 本來就會一起載；真的沒載就刪，`removeMany` 在動任何東西之前先拋錯
- 範圍只到「刪除當下」，Sheet 上手動改出來的孤兒不管

🔲 `allowCreate`（選擇器裡直接「＋ 新增」對方一筆、回來自動選上）還沒做，卡在表單頁當流程呼叫端的幾個問題，見 [ROADMAP](../../../ROADMAP.md)。

---

## 驗證

| | 檢查什麼 | 在哪裡 |
| --- | --- | --- |
| **前端** | 合法性：`required`、數值範圍、`select` 選項、自訂規則 | `schema/validation.ts` 的 `validateRow`，一份、兩處呼叫 |
| **後端** | 安全性與結構完整性：id 不重複、目標存在、表在 `Config.gs` 的對照內、欄位名在 Sheet 表頭內 | `apps-script/Batch.gs` 的規劃階段 |

- **form 層**：送出前跑 `validateRow`，不通過就不送，`fieldErrors` 交給 `DataForm` 逐欄顯示。**第一次按送出之前不提示**，按過一次之後改成即時更新。`askFields` 同一套，只驗問到的欄位
- **store 層**：`create`／`update` 在碰快取與佇列之前再擋一次，有錯就把訊息串成一句拋出去、什麼都不動。錯誤經 `useActionRunner` 進 snackbar
- **`update` 只給幾欄時**只驗那幾欄，但會拿快取裡那筆合併後再驗，所以跨欄位規則看得到整列

### 內建約束與自訂規則

內建的只有 `required`、`min`／`max`（number）、`select` 的選項。其他規則寫在欄位的 `validate` 上：

```ts
{
  key: 'endAt', label: '結束', type: 'date',
  validate: (value, row) => row.startAt && value < row.startAt ? '不能早於開始日期' : null,
}
```

- 內建檢查過了、**而且有值時**才叫——空值是 `required` 的事
- `value` 的型別跟 `type` 走，`row` 是整列，跨欄位比較直接讀
- 一欄一個函式，多條規則自己在裡面串
- 代價：「某條件下才必填」寫不了

### 型別層面靠輸入元件

number 用 `v-number-input`（`min`／`max`／`step` 一起傳下去）、date 用 `v-date-input`、select 用 `v-select` 只能選 `options`。驗證函式擋的是元件擋不住的那些（沒填、超出範圍）。

select 兩個可選開關：

- **`allowCustom`**：變成 `v-combobox`，`options` 只是建議、打別的字也收，驗證跟著跳過選項檢查。資料形狀仍然是一個字串
- **`suggestFromData`**：建議清單再接上這張表資料裡用過、`options` 沒有的值（`options` 照原順序在前，其餘依出現次數再依字串）

---

## 新增表單的初始值

三層疊出來，後面的蓋前面的：

1. **schema 的 `default`** — 跟來源無關的固定值。可以是值或函式，函式在打開表單那一刻才求值（`() => new Date()`）
2. **導覽帶來的 `history.state.defaults`** — 從哪裡按新增決定。`newAction(table, { defaults })` 收 getter，按下去的當下才求值
3. **`useCreateForm` 的第三個參數** — 頁面自己算得出來的

> 初始值只存在於前端：後端沒有欄位層的 schema，不會替沒給的欄位填任何值（`create` 沒送到的欄位即留空）。

---

## Schema 的角色

- 前端讀取時的型別轉換依據
- 共用欄位元件的設定來源（顯示順序、輸入元件、select 選項、ref 目標表）
- 送給後端的 payload 長什麼樣（表頭當 key、值是字串）
- **不用來自動產生整個頁面**——版面與內容由開發者決定

**後端沒有欄位層的 schema**：它認表頭（payload 的 key 就是表頭文字），只需要知道「代稱 → 分頁名稱 + ID 欄」這一行對照。所以加減欄位只要改前端 schema 與 Sheet 本身，兩邊要一起動的只有「加一張表」。

**各表的定義在 `schema/tables/`**（一張表一個檔），`schema/` 根目錄則是一批**對 row 做事的純函數**：`types.ts`（型別、`coerceRow`／`formatColumnValue`）、`sort.ts`（`sortRows`／`sortableColumns`）、`group.ts`（`groupRows`／`flattenGroups`）、`filter.ts`（`Filters` 與比對）、`validation.ts`、`relations.ts`、`image.ts`。它們都不碰 reactivity；`composables/data/` 底下的 `useFilter`／`useTable` 只是把它們包成 computed。

**前端不知道 Sheet 分頁叫什麼**：程式碼裡好打的英文代稱（`schemas` 的 key，`'order'`）就是打 API 用的值（`?table=order`），分頁的實際名稱只有後端需要，對照表在 `apps-script/Config.gs`——所以改分頁名稱不用動前端。`tableLabel` 是另一件事：畫面上怎麼顯示這張表（表的 chip、頁籤比對）。

---

## 擴充欄位型別

`ColumnTypes` 那張表定義每種 `type` 的值型別與專屬設定，`ColumnBase` 是共同骨架，`SchemaColumn` 疊 Sheet／表單設定、`VirtualColumn` 疊 `value`。加一種型別至少改 `ColumnTypes`、`coerceValue`、`formatColumnValue`（顯示與寫回 Sheet 兩種文字）、`DataForm` 四處，兩種欄位自動都有；要進篩選抽屜或需要特別的排序時，另改 `schema/filter.ts`、`FilterPanel` 與 `schema/sort.ts`。用 discriminated union 寫，所以「標了 `type: 'ref'` 卻忘記填 `refTable`」在編譯期就報錯。

## 已知缺口

`refTable` 只存代稱字串，沒有型別檢查它是否真的存在於 `schemas`。
