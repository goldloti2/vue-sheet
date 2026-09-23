# 資料表與 Schema

一張表要怎麼描述給框架看：欄位、關聯、驗證、預設值。

> **前置**：讀這份之前不用先讀別的。實際新增一張表的步驟見 [template/README.md](../template/README.md)；每個欄位的完整說明寫在 [`src/schema/types.ts`](../src/schema/types.ts) 的型別上（游標停在欄位名就會跳出來）。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 怎麼用

一張表 = 一個 Row 介面 + 一個 schema 物件。

> 下面是用來**看**的例子。要複製的骨架在 [template/table/schema.ts](../template/table/schema.ts)。

```ts
// src/schema/order.ts
export interface OrderRow extends RowBase {
  title: string | null
  amount: number | null
  orderedAt: Date | null
  // 虛擬欄位與 store 掛的 getter 要自己宣告型別
  readonly withTax: number | null
}

export const orderSchema: TableSchema<OrderRow> = {
  sheetName: '訂單',            // Sheet 分頁的實際名稱
  idColumn: '訂單編號',          // ID 欄的實際表頭
  newId: prefixedId('ORD'),     // 怎麼發新 id
  labelColumn: 'title',         // 別的表 ref 到這裡時顯示哪一欄
  columns: [
    { key: 'title', label: '名稱', type: 'text', required: true, searchable: true },
    { key: 'amount', label: '金額', type: 'number', min: 0, searchable: true },
    { key: 'orderedAt', label: '下單日期', type: 'date' },
  ],
  virtualColumns: [
    { key: 'withTax', label: '含稅', type: 'number', value: row => row.amount === null ? null : row.amount * 1.05 },
  ],
  defaultSort: [{ key: 'orderedAt', direction: 'desc' }],
}
```

寫成 `TableSchema<OrderRow>` 是為了讓 TS 幫忙對答案：`key`、`labelColumn`、`detailOrder`、`defaultSort` 只能填 Row 有的欄位名，`type` 要跟 Row 那個欄位的值型別相符，虛擬欄位 `value` 的 `row` 也直接是 `OrderRow`。

最後在 `src/schema/index.ts` 註冊，`TableKey` 就自動多一個值。

---

## Sheet 上的慣例

- **一個 Sheet 分頁 = 一張表**
- **第一欄是唯一 ID**，不用 row number 當主鍵——排序、刪除、插入都會讓 row index 位移
- **ID 同時是跨表關聯的外鍵**
- **表頭用對外名稱**（使用者看得懂的那個名字），方便直接開 Sheet 檢查或手改資料

欄位因此有兩個名字：程式裡用的 `key`（英文、好打、不會變），和 Sheet 上給人看的 `sheetHeader`。畫面上的 `label` 通常就是同一個對外名稱，所以 `sheetHeader` 省略時自動用 `label`；只有「Sheet 上的表頭跟畫面上想顯示的不一樣」時才需要分開寫：

```ts
{ key: 'title', label: '名稱', type: 'text' }                      // 表頭是「名稱」
{ key: 'title', label: '名稱', sheetHeader: '訂單名稱', type: 'text' } // 表頭是「訂單名稱」
```

---

## 欄位

- **真實欄位**（`columns`）：Sheet 上真的有的，可編輯
- **虛擬欄位**（`virtualColumns`）：不存在 Sheet 上、讀的時候才算。來源可以是這一列自己（價格加手續費），也可以是子表（父表用第一筆子列的名字當標題、子表金額加總）

虛擬欄位除了不能編輯，其他都跟真實欄位一樣：顯示、排序、分組、`defaultSort`、`searchable` 都能用。因為它跟 `columns` 分開放，`coerceRow`／`serializeRow`／表單完全不用知道它存在。

型別有 `text`／`number`／`date`／`select`／`ref`／`image` 六種，每種有自己的專屬設定（`number` 的 `min`／`max`、`select` 的 `options`、`ref` 的 `refTable`…）。完整清單見 [`types.ts`](../src/schema/types.ts)。

### image 欄位

一格一張圖，值仍然是一個字串，**來源看內容決定**：

| 值長這樣 | 當成 |
| --- | --- |
| `<svg …` | 行內 SVG |
| `https://drive.google.com/…/d/<id>/…` 或 `?id=<id>` | Drive 分享連結，取出 id |
| 其他 `http(s)://…` | 圖片網址 |
| 其餘 | Drive 檔案 id |

顯示時一律用 `imageSrc(value)`（`schema/image.ts`）轉成 `<img src>`：Drive 走 `https://drive.google.com/thumbnail?id=<id>&sz=w<寬>`（沿用瀏覽器已登入的 Google 帳號，不用後端、沒有 CORS），SVG 轉成 `data:image/svg+xml,`。

- **詳細頁自動顯示圖片**（`DataDetail` → `DetailField`），不用多做什麼
- **列表縮圖要頁面自己給**：`DataList` 的 `image` prop 傳 `imageSrc(row.photo)`，沒傳就不顯示
- **表單就是純文字欄位**：貼網址、Drive 連結或整段 SVG。上傳到 Drive 還沒做
- **不進搜尋與篩選**

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
- **不可列舉**：`{ ...row }`、`Object.keys`、`JSON.stringify` 都看不到，所以寫回後端時不會誤送
- **會自動更新**：getter 讀的是 store 快取，在 template 或 `computed` 裡讀就會被追蹤，子表一改當場重算
- **子表還沒載入時是空陣列**，載進來後自動重算
- **子列陣列不要就地改**（`sort`／`push`）：回傳的是索引裡的同一份

---

## 跨表關聯

外鍵放在「多」的那一方。標一個欄位就完成，不用另外註冊：

```ts
{ key: 'parent', label: '所屬', type: 'ref', refTable: 'parentTable' }
```

`schema/relations.ts` 會掃過所有 schema 自動算出關聯圖。標好之後：

- **顯示**：任何地方都顯示對方的名字（對方 schema 的 `labelColumn`），不是 id
- **表單**：`DataForm` 做成可搜尋的下拉清單（`v-autocomplete`），對方整張表載進共用快取
- **從詳細頁點過去**：在 `fieldActions` 列一個 `useGoToRefAction`
- **兩邊都走得到**：子列用 `row.$欄位key`、父列用 `row.$子表_欄位key`（照子表的 `defaultSort` 排）
- **不驗證目標存不存在**：選擇器只選得到現有的列

### 「一」的那一方不存清單

Sheet 上的真相只有子表的 ref 欄位一份，父列上的陣列是讀的時候算出來的，所以新增／刪除子列不用維護任何東西。框架也沒有清單型別的欄位。

不過 **ref 的方向沒有限制**：父表可以加一個 ref 指向**某一筆特定的**子列（例如「代表項目」），兩張表就互為對方的父／子。代價是載入時互相需要（`ensureLoaded` 的 `seen` 擋掉循環），而且兩邊都標 cascade 前要想清楚刪除會連到哪裡。

### 子列 getter 的命名

`$子表代稱_ref欄位key`（例如 `$child_parent`）。零設定，看 schema 就推得出來；帶上欄位名是為了同一張子表有兩個 ref 指向同一張父表時，兩條邊各有各的名字。

### 連帶刪除

在 ref 欄位加 `onDelete: 'cascade'`，父列被刪時指向它的子列一起刪，多層遞迴。刪除動作不用改。

- 走的是同一條 `patch` + `enqueue`，所以佇列合併、流程存檔點與回滾都自動涵蓋，**後端不用知道這件事**
- 不標就維持原狀：子列留著、ref 指向不存在的 id（顯示退回 id）
- 子表必須在快取裡才找得到子列——`ensureLoaded` 本來就會一起載；真的沒載就刪，`removeMany` 在動任何東西之前先拋錯
- 範圍只到「刪除當下」，Sheet 上手動改出來的孤兒不管

🔲 `allowCreate`（選擇器裡直接「＋ 新增」對方一筆、回來自動選上）還沒做，卡在表單頁當流程呼叫端的幾個問題，見 [ROADMAP](../../ROADMAP.md)。

---

## 驗證

| | 檢查什麼 | 在哪裡 |
| --- | --- | --- |
| **前端** | 合法性：`required`、數值範圍、`select` 選項、自訂規則 | `schema/validation.ts` 的 `validateRow`，一份、兩處呼叫 |
| **後端** | 安全性與結構完整性：id 不重複、目標存在、表名與欄位名在 schema 內 | 🔲 還沒實作 |

- **form 層**：送出前跑 `validateRow`，不通過就不送，`fieldErrors` 交給 `DataForm` 逐欄顯示。**第一次按送出之前不提示**，按過一次之後改成即時更新。`askFields` 同一套，只驗問到的欄位
- **store 層**：`create`／`update` 在碰快取與佇列之前再擋一次，有錯就把訊息串成一句拋出去、什麼都不動。這層擋的是繞過表單的程式 bug，錯誤經 `useActionRunner` 進 snackbar
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

number 用 `v-number-input`（`min`／`max` 一起傳下去）、date 用 `v-date-input`、select 用 `v-select` 只能選 `options`。驗證函式擋的是元件擋不住的那些（沒填、超出範圍）。

select 兩個可選開關：

- **`allowCustom`**：變成 `v-combobox`，`options` 只是建議、打別的字也收，驗證跟著跳過選項檢查。資料形狀仍然是一個字串
- **`suggestFromData`**：建議清單再接上這張表資料裡用過、`options` 沒有的值（`options` 照原順序在前，其餘依出現次數再依字串）

---

## 新增表單的初始值

三層疊出來，後面的蓋前面的：

1. **schema 的 `default`** — 跟來源無關的固定值。可以是值或函式，函式在打開表單那一刻才求值（`() => new Date()`）
2. **導覽帶來的 `history.state.defaults`** — 從哪裡按新增決定。`useNewAction(table, defaults)` 收 getter，按下去的當下才求值
3. **`useCreateForm` 的第三個參數** — 頁面自己算得出來的

> 函式型的 `default` 只存在於前端。前後端各自維護一份 schema，靜態值兩邊可以對照著寫、函式沒辦法——跟「合法性驗證只在前端做」是同一條線。

---

## Schema 的角色

- 前端讀取時的型別轉換依據
- 共用欄位元件的設定來源（顯示順序、輸入元件、select 選項、ref 目標表）
- 後端泛用 CRUD 引擎的依據
- **不用來自動產生整個頁面**——版面與內容由開發者決定

前後端各自維護一份，不共用程式碼。欄位改動時兩邊要手動同步；等到真的常常對不起來，再考慮做產生器。

`schema/index.ts` 另外帶「代稱 → 實際分頁名稱」的對照：程式碼裡好打的英文代稱（`'order'`）不等於 Sheet 分頁的實際名稱（那是對外名稱，通常不是英文）。打 API 用的是 `sheetName`，兩者分開——換代稱不影響 API，換分頁名稱也不用到處改字串。

---

## 設計取捨

**為什麼跨表的值是 getter，而不是在父表存一份**
雙向維護容易不一致（新增子列要記得更新父列），而且 Sheet 上會多出沒人維護的欄位。改成讀的時候算，真相永遠只有一份。代價是載一張表就會把它的父表與子表都一起載進來——這個規模無所謂，而且要顯示關聯資料本來就得整張載。

**子列為什麼要建索引**
`$子表_欄位key` 如果每次讀都重掃整張子表，一個列表頁每列讀好幾次就是 N×M 次比對。改成每條關聯一份「父 id → 子列」的索引（整張子表排序一次後分組）放在 `computed` 裡，子表的陣列被換掉才重建，讀取只是查表。順帶讓回傳的陣列身分穩定。

**為什麼合法性驗證只在前端**
Sheet 本來就能手動打開來亂改，後端擋合法性也擋不完整，不如把責任明確劃給前端一份。後端只留「結構完整性」——打錯的欄位名會直接在 Sheet 上長出一欄新表頭或寫錯格，這項不能省。

**為什麼 `allowCustom` 與 `suggestFromData` 是兩個開關**
「清單自己長」不一定是好事：打錯過的值也會變成建議，而清單只會長不會收。所以分開，讓設計者自己決定。

**為什麼 `TableSchema<Row>` 只做單向檢查**
Row 介面仍然要手寫（虛擬欄位的 `readonly xxx`、store 掛的 `readonly $欄位key?`），泛型不會反過來從 schema 產生介面——那需要兩段式 builder 加跨表的延遲查表，schema 就不再是一眼看完的物件字面值，不值得。框架端一律用不帶參數的 `TableSchema`，它的 Row 預設是 `any`；不用 `object` 是因為 `keyof Row` 讓 TS 把 Row 判成逆變，`TableSchema<XxxRow>` 會塞不進 `TableSchema<object>`。

**為什麼 `PageAction` 只有 `onClick`、沒有宣告式的 `to`**
求值時機：action 物件在頁面 setup 時就建好，寫進 `to` 的值那時就定型，切了頁籤再按新增會帶到舊狀態。統一成一種也免得兩個都設時變成「導覽 + 執行」兩件事一起發生。代價是動作渲染成 `<button>` 而非 `<a>`，失去中鍵開新分頁與連結的無障礙語意——這個 App 的動作都在 FAB 與 App Bar 上，用不太到。

**為什麼預設值走 `history.state` 而不是 query param**
不讓值出現在網址上；比全域變數好的地方是**值綁在那一筆歷史紀錄上**，不會殘留下來汙染之後不相關的表單。

**欄位型別怎麼擴充**
`ColumnTypes` 那張表定義每種 `type` 的值型別與專屬設定，`ColumnBase` 是共同骨架，`SchemaColumn` 疊 Sheet／表單設定、`VirtualColumn` 疊 `value`。加一種型別只改 `ColumnTypes`、`coerceValue`、`formatColumnValue`、`DataForm` 四處，兩種欄位自動都有。用 discriminated union 寫，所以「標了 `type: 'ref'` 卻忘記填 `refTable`」在編譯期就報錯。

**已知缺口**
`refTable` 只存代稱字串，沒有型別檢查它是否真的存在於 `schemas`——這是為了避免 `schema/types.ts` 反過來 import `schema/index.ts` 造成循環依賴，目前接受這個缺口。
