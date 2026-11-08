# 資料表與 Schema

一張表向框架描述的方式：欄位、關聯、驗證、預設值。

> **前置**：閱讀此文件之前，無須先閱讀其他文件。實際新增一張表的步驟見 [template/README.md](../../template/README.md)。每個欄位的完整說明寫在 [`src/schema/types.ts`](../../src/schema/types.ts) 的型別上，游標停在欄位名稱上即顯示。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 用法

一張表由一個 Row 介面與一個 schema 物件組成。

> 下方為說明用的例子。供複製的骨架見 [template/table/schema.ts](../../template/table/schema.ts)。

```ts
// src/schema/tables/order.ts
export interface OrderRow extends RowBase {
  code: string | null
  title: string | null
  amount: number | null
  orderedAt: Date | null
  // 虛擬欄位與 store 掛上的 getter 須自行宣告型別
  readonly withTax: number | null
}

export const orderSchema: TableSchema<OrderRow> = {
  tableLabel: '訂單',           // 畫面上顯示這張表的名稱
  idColumn: 'code',             // 主鍵欄
  newId: prefixedId('ORD'),     // 主鍵留空時的發號方式
  labelColumn: 'title',         // 其他表 ref 到這張表時顯示的欄位
  columns: [
    { key: 'code', label: '訂單編號', type: 'text' },
    { key: 'title', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'orderedAt', label: '下單日期', type: 'date' },
  ],
  virtualColumns: [
    { key: 'withTax', label: '含稅', type: 'number', value: row => row.amount === null ? null : row.amount * 1.05 },
  ],
  // 可搜尋、篩選與可排序的欄位，順序即抽屜與排序面板上的順序
  searchable: ['title', 'orderedAt', 'amount'],
  sortable: ['orderedAt', 'amount'],
  defaultSort: [{ key: 'orderedAt', direction: 'desc' }],
}
```

以 `TableSchema<OrderRow>` 宣告時：
- `key`、`idColumn`、`labelColumn`、`searchable`、`sortable`、`detailOrder`、`defaultSort` 只能填入 Row 擁有的欄位名稱。`idColumn` 另限值為字串的欄位
- `type` 須與 Row 中該欄位的值型別相符
- 虛擬欄位 `value` 的 `row` 型別直接為 `OrderRow`

最後在 `src/schema/index.ts` 註冊這張表，`TableKey` 即自動多一個值。

---

## Sheet 上的慣例

- **一個 Sheet 分頁對應一張表**
- **每張表有一個唯一的主鍵欄**，通常為第一欄（見下方「主鍵」）。不以 row number 作為主鍵
- **主鍵同時是跨表關聯的外鍵**
- **表頭使用對外的名稱**，即使用者看得懂的名稱

因此欄位有兩個名稱：程式中使用的 `key`（英文），以及 Sheet 上給人看的 `sheetHeader`。
- 畫面上的 `label` 通常即為同一個對外名稱，因此省略 `sheetHeader` 時，自動使用 `label`
- 只有 Sheet 上的表頭與畫面上要顯示的名稱不同時，才須分開指定。例如畫面顯示「名稱」、Sheet 的表頭為「訂單名稱」時，另外加上 `sheetHeader: '訂單名稱'`

**寫回 Sheet 前，`serializeRow` 為部分的值加上單引號**：Sheet 將寫入的字串視為「使用者在該格輸入的內容」解析，有幾種形狀會使該格變成其他型別。
- 只有下表的形狀加上單引號，其他值原樣送出
- 單引號是 Sheet 的純文字前綴，不屬於內容，讀回時不含單引號

| 值的形狀 | 未加單引號時 |
| --- | --- |
| `=` 或 `+` 開頭 | 變成公式或算式 |
| `0` 開頭 | 被視為數字，前導零消失（`0912` 變成 `912`） |
| `1/2`、`2021/03/01` | 變成日期 |
| `1E5` | 變成數字 `100000` |

只有 `text`、`select`、`image` 三種型別加上單引號：

- `number`、`date`、`duration`、`boolean` 不加
- **`ref` 與主鍵皆不加**：主鍵不以數字或 `=`、`+`、`-`、`'` 開頭，也不含 `/`（見下方「主鍵」），不會符合上表的任一種形狀

單引號由前端處理，後端不參與。

---

## 主鍵

`idColumn` 指向 `columns` 中的一欄，該欄的值即為 `row.id`。store、路由與跨表關聯皆以 `row.id` 運作。主鍵須為值是字串的欄位（例如 `text`、`ref`、`select`），型別不符時 TS 擋下。

- **新增**：該欄有值時，即作為 id。值為空時，才以 `newId()` 發號並填回該欄。省略 `newId` 時，主鍵為必填
- **新增表單是否出現主鍵**，依這一頁實際使用的順序決定，即頁面的 `order`，否則為 `formOrder`。兩者皆省略時，所有欄位皆出現
  - 主鍵未排入時，一律發號
  - 主鍵排入時，可自行輸入。有 `newId` 時，欄位下方提示「留空即自動產生」
  - 主鍵只能由預設值帶入時（例如延伸表從父列的頁面新增），`newAction` 或 `openForm` 以 `lockId` 將主鍵設為唯讀
- **不能重複**：新增時 id 已存在即拋出錯誤。剛刪除、尚未推送的 id 也不能再使用
- **建立後不能修改**：編輯表單，以及提供 `rows` 的 `askFields`（包括 `quickEditAction`）中，主鍵欄為唯讀。不經過表單的修改，由 store 的 `update` 拋出錯誤擋下
- **格式**：`prefixedId('ORD')` 這類前綴式即符合
  - 不以數字或 `=`、`+`、`-`、`'` 開頭
  - 只能使用英文字母、數字與 `-`、`_`、`.`、`!`、`~`、`*`、`'`、`(`、`)`，即 `encodeURIComponent` 不會改變的字元。中文與空白皆不可使用
  - 不能為 `.` 或 `..`
- **主鍵可以是 `ref`**：例如與父表共用 id 的一對一延伸表。新增時在表單上選擇父列，id 即等於父列的 id。關聯、`row.$欄位key` 與連帶刪除皆與其他 ref 欄位相同

---

## 欄位

- **真實欄位**（`columns`）：Sheet 上實際存在的欄位，可編輯
- **虛擬欄位**（`virtualColumns`）：不存在於 Sheet 上，讀取時才計算。來源可以是這一列本身（例如價格加手續費），也可以是子列（例如父表以第一列子列的名稱作為標題、子列金額的加總）

虛擬欄位除了不能編輯，其餘都與真實欄位相同：
- 可以顯示、排序、分組
- 可列入 `searchable`、`sortable`、`defaultSort`、`detailOrder`
- 虛擬欄位與 `columns` 分開放置。`coerceRow`、`serializeRow` 與送出的值皆不處理虛擬欄位

排進 `formOrder` 時，虛擬欄位於表單中唯讀顯示，隨輸入即時重算。讀取父列（`row.$欄位key`）的虛擬欄位也能算出。新增表單的 id 仍為空，因此讀取子列（`row.$子表_欄位key`）的虛擬欄位，在新增時一律沒有子列。

虛擬欄位也可以是 `ref`：`value` 回傳父列的 id，用於經由另一列父列取得的多層關聯。
- store 同樣掛上 `row.$欄位key`，顯示、排序與搜尋皆以父列的名稱呈現，父表也一起載入
- 虛擬的 ref 不進入關聯圖：父表沒有對應的 `$子表_欄位key`，不能設定 `onDelete`、`onEmpty`。dashboard 的接線可以使用虛擬的 ref（見 [DashboardPage](../components/panel/DashboardPage.md#小工具)）

型別共有八種：`text`、`number`、`date`、`duration`、`boolean`、`select`、`ref`、`image`。每種型別有專屬的設定，例如 `number` 的 `min`、`max`、`step`，`select` 的 `options`，`ref` 的 `refTable`。完整清單見 [`types.ts`](../../src/schema/types.ts)。

`text` 的 `multiline: true` 為長文：表單與快速編輯改為多行的輸入框，詳細頁保留值中的換行。列表與標頭中，換行顯示為空格。值、搜尋、篩選與排序皆與一般的 `text` 相同。外觀見 [design/form.md](../design/form.md) 與 [design/detail.md](../design/detail.md)。

`number` 的 `step` 為表單上 −／＋ 每次的增減，預設為 1。輸入的值不受 `step` 限制，例如 `step: 0.5` 時仍可輸入 1.3。表單不限制小數位數，輸入的值不會被四捨五入。

### date 與 duration

- **`date` 只有日期**：讀入時歸零至當天午夜
- **`duration` 為一段長度，不是時間點**：值為 `"時:分:秒"` 字串，分與秒各兩位，**時數不設上限**。例如 `2:30:00` 為兩個半小時，`30:15:45` 也合法
- 讀入時接受 `H:mm`（秒補為 `00`）與 `H:mm:ss`。分或秒超過 59，或格式不符時，視為空值
- 表單為一般文字框，格式不符時由驗證擋下
- 排序與篩選皆換算為秒後比較。篩選為**範圍**（最短、最長）
- 🔲 **沒有「幾點幾分」的型別**。須使用時間點時另外新增，不以 `duration` 代替

### boolean 欄位

- **值為 `true`、`false` 或空（`null`）**：Sheet 上為 `TRUE`、`FALSE` 或空的儲存格。空的即為空，不視為否
- **讀取時不分大小寫**，前後的空白也忽略。`TRUE`、`FALSE` 以外的值（例如手動填入的 `是`、`1`）一律視為空。這類列經表單儲存後，該格寫為空
- **Sheet 上不使用核取方塊**：核取方塊只有勾選與未勾選，無法留空
- **寫回時**寫入 `TRUE`、`FALSE`，空值寫入空字串
- **顯示為「是」「否」**，空值不顯示
- **表單**為「否」「是」兩個互斥的按鈕。再按一次已選取的按鈕即清空
- **篩選**可勾選是、否或「(空白)」。**排序**時否在前、是在後，空值排在最後
- **不進入搜尋列**，列入 `searchable` 時屬於篩選抽屜

### image 欄位

一格一張圖，值仍為一個字串，**依內容判斷來源**：

| 值的形狀 | 視為 |
| --- | --- |
| `<svg …` | 行內 SVG |
| `https://drive.google.com/…/d/<id>/…` 或 `?id=<id>` | Drive 分享連結，取出 id |
| 其他 `http(s)://…` | 圖片網址 |
| 其餘 | Drive 檔案 id |

顯示時一律以 `imageSrc(value)`（`schema/image.ts`）轉換為 `<img src>`：Drive 使用 `https://drive.google.com/thumbnail?id=<id>&sz=w<寬>`，SVG 轉換為 `data:image/svg+xml,`。

- **詳細頁自動顯示圖片**（`DataDetail` → `DetailField`），無須另外處理
- **列表的縮圖於 view 中指定**：`defineView(schema, { image: 'photo', … })`，由 view 轉換為 src（見 [DataList](../components/list/DataList.md)、[DataProfile](../components/list/DataProfile.md)、[DataCard](../components/list/DataCard.md)、[DataGallery](../components/list/DataGallery.md)）
  - `DataList` 顯示為縮圖，`DataProfile` 顯示為圓形頭像
  - `DataCard` 依所在的組顯示為頭像或大圖
  - `DataGallery` 顯示為正方形圖片
  - 未指定時不顯示，`DataGallery` 以方塊佔位
- **表單為純文字欄位**：貼上網址、Drive 連結或整段 SVG。上傳到 Drive 尚未實作
- **不進入搜尋與篩選**

---

## 欄位呈現與其順序

各畫面出現哪些欄位、以什麼順序排列，寫在表的層級，以 key 的清單表示：

| 清單 | 決定的內容 |
| --- | --- |
| `searchable` | 哪些欄位進入搜尋列（`text`、`ref`）或篩選抽屜（其餘型別）。**順序即抽屜第一層的順序** |
| `sortable` | 哪些欄位進入排序面板，`image` 列入也略過。**順序即面板上的順序** |
| `detailOrder`、`formOrder` | 詳細頁與表單頁的欄位順序，未列出的欄位在詳細頁不顯示。`formOrder` 中的虛擬欄位為唯讀 |
| `defaultSort` | 列表的預設排序。有多個時，依序作為次要的排序 |

四份清單皆可省略，省略即表示沒有。`detailOrder`、`formOrder` 例外：省略時沿用 `columns` 的順序。key 打錯時 TS 擋下，型別為 `RowKey<Row>[]`，依 Row 介面檢查。

`detailOrder`、`formOrder` 是這張表的預設。個別頁面須使用不同的欄位或順序時，以 `DetailPage` 的 `order` prop 或 `openForm` 的 `order` 選項覆寫，只影響那一次（見 [DetailPage](../components/page/DetailPage.md)、[FormLayerHost](../components/shell/FormLayerHost.md#openform-的選項)）。

### 依條件顯示

真實欄位與虛擬欄位皆可加上 `showIf: row => boolean`。回傳 `false` 時，詳細頁不顯示該欄，名稱也一起隱藏。`row` 與虛擬欄位的 `value` 相同，可讀取虛擬欄位與 `$欄位key` 等 getter。

- **只作用於詳細頁**：表單、列表的 view、表格皆不受影響
- **row 尚未載入時一律顯示**，與沒有 `showIf` 的欄位相同

### 條件式格式

表層級的 `formatRules` 依條件改變欄位的呈現，對照 AppSheet 的 Format Rules。每條規則的屬性：

| 屬性 | 說明 |
| --- | --- |
| `when` | `row => boolean`，與 `showIf` 相同，可讀取虛擬欄位與 getter |
| `columns` | 套用的欄位，真實欄位與虛擬欄位皆可 |
| `color` | 文字顏色：`red`、`orange`、`yellow`、`green`、`blue`、`purple`、`grey` |
| `bold`、`italic`、`underline`、`strike` | 粗體、斜體、底線、刪除線 |
| `icon` | 值前面的圖示，即 `@mdi/js` 的 path |
| `iconColor` | 圖示的顏色，選項同 `color`。省略時與文字同色 |

- **多條規則同時符合時**：
  - 顏色取第一條有指定顏色的規則
  - 圖示依規則的順序全部顯示，各自帶有自己的顏色
  - 粗體等字形，任一條規則有即套用
- **顏色在深淺色主題各有一組色值**：這些顏色登記為 Vuetify 主題的共用色名 `vuesheet-*`，條件式格式以外的地方也可使用（使用方式見 [FormattedValue](../components/view/FormattedValue.md)，色值見 [design/README.md](../design/README.md#尺寸與樣式) 的「尺寸與樣式」）
- **值為空時完全空白**，不顯示圖示
- **套用於所有顯示值的地方**：詳細頁的欄位與標頭、列表 view 的各位置、表格的儲存格
- **ref 欄位的選擇器**：選項與選取的值套用父表 `labelColumn` 那一欄的規則，無須設定
- **不套用的地方**：表單與快速編輯中 ref 以外的輸入框、圖片欄位，以及 `id`、`$label` 這類不是 schema 欄位的位置
- 顯示的文字與格式由 `schema/format.ts` 的 `displayValue` 一起算出，由 [FormattedValue](../components/view/FormattedValue.md) 顯示

---

## row 上的 getter

store 在產生每一列時掛上下列 getter，讀取方式與真實欄位相同：

```ts
row.withTax        // 虛擬欄位
row.$label         // 這一列的名稱（labelColumn 指定的欄位，省略時為 id）
row.$parentKey     // ref 欄位指向的那一列（父列）
row.$child_parent  // 指向這一列的子列陣列
```

- **排序、分組、顯示皆可直接使用**：`sortRows`、`formatColumnValue`、列表頁的 `row.xxx` 都無須知道值是算出來的
- **不可列舉**：`{ ...row }`、`Object.keys`、`JSON.stringify` 皆看不到 getter
- **自動更新**：getter 讀取 store 的快取，在 template 或 `computed` 中讀取即被追蹤，子表一修改即重算
- **子表尚未載入時為空陣列**，載入後自動重算
- **不就地修改子列陣列**（例如 `sort`、`push`）：getter 回傳的是索引中的同一份陣列
- **兩個方向皆使用索引**：
  - 父列的索引為「id → 列」，子列的索引為「父列 id → 子列」
  - 兩份索引皆為 `computed`（`rowGetters.ts`），依賴另一張表，因此會自行失效
  - 每次讀取 getter 為一次查表，不掃描整張表

---

## 跨表關聯

外鍵放在「多」的那一方。標示一個欄位即完成，無須另外註冊：

```ts
{ key: 'parent', label: '所屬', type: 'ref', refTable: 'parentTable' }
```

`schema/relations.ts` 掃描所有 schema，自動算出關聯圖。標示之後：

- **顯示**：任何地方皆顯示父列的名稱，即父表 schema 的 `labelColumn`，不顯示 id
- **表單**：`DataForm` 呈現為可搜尋的下拉清單（`v-autocomplete`），父表整張表載入共用快取
- **從詳細頁前往父列**：在 `fieldActions` 列一個 `goToRefAction`
- **兩個方向皆可讀取**：子列以 `row.$欄位key` 讀取父列，父列以 `row.$子表_欄位key` 讀取子列，子列依子表的 `defaultSort` 排序
- **不驗證目標是否存在**：選擇器只能選到現有的列

### 「一」的那一方不存清單

Sheet 上的資料來源只有子表的 ref 欄位一份。父列上的陣列在讀取時算出。框架也沒有清單型別的欄位。

**ref 的方向沒有限制**：父表可以加一個 ref 指向**某一列特定的**子列（例如「代表項目」），兩張表即互為對方的父表與子表。
- 載入時兩張表互相需要對方，`ensureLoaded` 的 `seen` 擋下循環
- 兩邊都標示 cascade 之前，須確認刪除會連帶影響的範圍

### 子列 getter 的命名

命名為 `$子表代稱_ref欄位key`（例如 `$child_parent`），無須設定。同一張子表有兩個 ref 指向同一張父表時，兩條關聯各有各的名稱。

### 連帶刪除

在 ref 欄位加上 `onDelete: 'cascade'`：父列被刪除時，指向父列的子列一起刪除，可多層遞迴。刪除動作無須修改。

- 連帶刪除經過同一條 `patch` + `enqueue`，因此佇列合併、流程存檔點與回滾都自動涵蓋。**後端無須知道連帶刪除**
- 未標示時維持原狀：子列保留，ref 指向不存在的 id，顯示時改為顯示 id
- 子表須在快取中才找得到子列。`ensureLoaded` 本身即一起載入子表。子表確實未載入時，`removeMany` 在修改任何資料之前先拋出錯誤
- 範圍只到「刪除的當下」，不處理 Sheet 上手動造成的孤兒子列

### 沒有子列時刪除父列

在 ref 欄位加上 `onEmpty: 'delete'`：指向父列的子列減少，使父列一列子列都不剩時，父列一起刪除。方向與連帶刪除相反，兩者各自獨立，可同時標示。

- **子列減少**有兩種情況：子列被刪除，以及子列的 ref 改指其他父列（`update`）。兩者經過同一個檢查
- **只在減少時檢查**：剛建立、尚無子列的父列不會被刪除，例如「先新增父列、再新增子列」的流程
- **多層往上**：被刪除的父列若也是另一張表的子列，同樣檢查它的父列
- 與連帶刪除相同，經過 `patch` + `enqueue`，佇列合併、流程存檔點與回滾都自動涵蓋
- 範圍只到前端的寫入，不處理 Sheet 上手動造成的空父列

### 選擇器的順序

在 ref 欄位加上 `refSort`：格式與 `defaultSort` 相同，鍵為父表的欄位。表單與快速編輯對話框的選擇器，選項先依 `refSort` 排序，再依父表的 `defaultSort` 排序。

- 省略時只依父表的 `defaultSort` 排序
- 只影響這個欄位的選擇器，不影響父表的列表
- 欄位的值為空時排在最後。須排在前面時，在父表加上虛擬的 boolean 欄位，置於該欄位之前排序

### 選擇器中新增父列

在 ref 欄位加上 `allowCreate: true`：表單的選擇器清單最上方多一項「新增…」。

- 按下時開啟父表的新增表單（見 [pages.md](pages.md#表單層)），外層的表單留在下方，內容不變
- 送出後回到外層的表單，並選取新的列。取消時不改動
- **只支援一層**：父表的新增表單中不顯示此項
- 快速編輯對話框與行內欄位的選擇器不顯示此項
- 外層的表單取消時，新的父列保留。外層為流程的一步時，新的父列隨流程還原

---

## 驗證

| | 檢查的內容 | 位置 |
| --- | --- | --- |
| **前端** | 值是否合法：`required`、數值範圍、`select` 選項、自訂規則 | `schema/validation.ts` 的 `validateRow`，一份程式，兩處呼叫 |
| **後端** | 安全性與結構完整性：id 不重複、目標存在、表在 `Config.gs` 的對照內、欄位名稱在 Sheet 表頭內 | `apps-script/Batch.gs` 的規劃階段 |

- **表單層**：送出前執行 `validateRow`，不通過即不送出，`fieldErrors` 交給 `DataForm` 逐欄顯示。**第一次按送出之前不提示**，按過一次之後改為即時更新。`askFields` 使用同一套驗證，只驗證詢問的欄位
- **store 層**：`create`、`update` 在修改快取與佇列之前再檢查一次。有錯誤時，把訊息串成一句拋出，不修改任何資料。錯誤經由 `useActionRunner` 顯示於 snackbar
- **`update` 只提供幾欄時**，只驗證那幾欄，但先與快取中的那一列合併後再驗證，因此跨欄位的規則能讀到整列

### 內建約束與自訂規則

內建的約束只有 `required`、`min`／`max`（number）與 `select` 的選項。其他規則寫在欄位的 `validate` 上：

```ts
{
  key: 'endAt', label: '結束', type: 'date',
  validate: (value, row) => row.startAt && value < row.startAt ? '不能早於開始日期' : null,
}
```

- 通過內建的檢查、**且有值時**才呼叫。空值由 `required` 檢查
- `value` 的型別隨 `type` 而定，`row` 為整列，跨欄位的比較直接讀取 `row`
- 一欄一個函數，多條規則在函數中自行串接
- 限制：無法表達「某條件下才必填」

### 型別層面由輸入元件處理

number 使用 `v-number-input`（`min`、`max`、`step` 一併傳入），date 使用 `v-date-input`，select 使用 `v-select`，只能選擇 `options`。驗證函數檢查元件擋不住的情況，例如未填寫、超出範圍。

select 的 `allowCustom`：改為 `v-combobox`，`options` 只是建議，輸入其他文字也接受，驗證也略過選項檢查。資料的形狀仍為一個字串。

### 建議值（`suggestedValues`）

`allowCustom` 的 select 可另加 `suggestedValues: (row, rows) => 值的清單`，算出的值接在 `options` 後面作為建議，對照 AppSheet 的 Suggested Values：

- **`row`** 為正在編輯的那一列，getter 已掛上。可讀取父列（`row.$欄位key`）與父列的其他子列（`row.$欄位key.$子表_欄位key`）。表單中修改 ref 時，建議隨之更新
- **`rows`** 為這張表的所有列。例如列出這一欄在資料中用過的值：`(row, rows) => rows.map(other => other.欄位)`
- **順序**：`options` 依原順序在前，算出的值依回傳的順序在後。重複的值與空值去除
- 只影響表單與快速編輯的建議清單，不限制可填入的值

---

## 新增表單的初始值

初始值由兩層疊成，後面的覆蓋前面的：

1. **schema 的 `default`**：與來源無關的固定值。可以是值或函數，函數在開啟表單時才求值，例如 `() => new Date()`
2. **開啟表單時傳入的 `defaults`**：依按下新增的位置決定。`newAction(table, { defaults })` 接收 getter，按下時才求值

> 初始值只存在於前端：後端沒有欄位層的 schema，不為未提供的欄位填入任何值。`create` 未送出的欄位即留空。

---

## Schema 的角色

- 前端讀取時型別轉換的依據
- 共用欄位元件的設定來源：顯示順序、輸入元件、select 選項、ref 的目標表
- 送給後端的 payload 的形狀：以表頭為 key，值為字串
- **不用來自動產生整個頁面**：版面與內容由開發者決定

**後端沒有欄位層的 schema**：
- 後端依表頭辨識欄位，payload 的 key 即為表頭文字
- 後端只須知道「代稱 → 分頁名稱與 ID 欄」這一行對照
- 因此增減欄位只須修改前端 schema 與 Sheet 本身。須同時修改前後端的只有「新增一張表」

**各表的定義在 `schema/tables/`**，一張表一個檔案。`schema/` 根目錄則為一批**處理列的純函數**：
- `types.ts`：型別、`coerceRow`、`formatColumnValue`
- `sort.ts`：`sortRows`、`sortableColumns`
- `group.ts`：`groupRows`、`flattenGroups`
- `filter.ts`：`Filters` 與比對
- `validation.ts`、`relations.ts`、`image.ts`

這些函數皆不使用 reactivity。`composables/data/` 中的 `useFilter`、`useTable` 只是把它們包裝成 computed。

**前端不知道 Sheet 分頁的名稱**：
- 程式中的英文代稱（`schemas` 的 key，例如 `'order'`）即為呼叫 API 時使用的值（`?table=order`）
- 分頁的實際名稱只有後端需要，對照表在 `apps-script/Config.gs`。因此修改分頁名稱時，無須修改前端
- `tableLabel` 用於另一件事：畫面上顯示這張表的名稱，例如表的 chip、頁籤的比對

---

## 擴充欄位型別

- `ColumnTypes` 定義每種 `type` 的值型別與專屬設定
- `ColumnBase` 為共同的骨架。`SchemaColumn` 疊加 Sheet 與表單的設定，`VirtualColumn` 疊加 `value`

新增一種型別至少須修改四處：`ColumnTypes`、`coerceValue`、`formatColumnValue`（顯示與寫回 Sheet 兩種文字）、`DataForm`。真實欄位與虛擬欄位即自動支援。須進入篩選抽屜或須特別的排序時，另外修改 `schema/filter.ts`、`FilterPanel` 與 `schema/sort.ts`。

型別以 discriminated union 撰寫，因此「標示 `type: 'ref'` 卻未填 `refTable`」在編譯期即報錯。

## 已知缺口

`refTable` 只存放代稱字串，沒有型別檢查它是否確實存在於 `schemas`。
