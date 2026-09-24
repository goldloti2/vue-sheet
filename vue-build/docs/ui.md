# UI 設計重點

畫面長什麼樣、動作擺在哪裡、搜尋與篩選怎麼運作。外觀仿 AppSheet，以手機優先。

> **前置**：動作與 KeepAlive 的機制見 [architecture.md](architecture.md)；每個元件的用法見 [components/](components/)。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 畫面各部位的名字

```
┌─────────────────────────────────┐
│ ←   標題           🔍  ⋮   ⟳    │  App Bar
│ ─────── 頁籤列 ───────           │  extension（有 TabView 時才出現）
├─────────────────────────────────┤
│                                 │
│   內容區                        │  ← 側邊欄       篩選抽屜 →
│   （pages/*.vue）               │
│                                 │
│                         ╭─────╮ │
│                         │  ＋ │ │  FAB
│                         ╰─────╯ │
│        ▁▁▁ snackbar ▁▁▁         │
├─────────────────────────────────┤
│  ⌂ 首頁      ▤ 表A     ▤ 表B    │  底部導覽列
└─────────────────────────────────┘
```

| 部位 | 元件／來源 | 說明 |
| --- | --- | --- |
| **App Bar** | `AppShell` | 頂部固定那條。標題來自 `route.meta.title`，沒有就用 `config/app.ts` 的 App 名稱 |
| **左側圖示** | `AppShell` | 有 App 內上一頁就是返回箭頭，否則是漢堡選單 |
| **App Bar 動作** | `useAppBarActions()` | 右側的圖示鈕，≥3 顆收成「⋮」 |
| **搜尋鈕／搜尋列** | `useAppBarSearch()` | 按放大鏡後整條 App Bar 換成輸入框 |
| **篩選鈕** | 同上 | 在搜尋輸入框內最右側 |
| **同步鈕** | `AppShell` | 永遠在最右邊，不屬於任何頁面 |
| **頁籤列** | `TabView` | 掛在 App Bar 底下的 extension，不跟著內容捲動 |
| **內容區** | `pages/*.vue` | 換頁時左右滑動的就是這一塊 |
| **側邊欄** | `AppShell` | 左側滑出，目前是空殼 |
| **篩選抽屜** | `FilterDrawer` | 右側滑出，兩層 |
| **FAB** | `PageFab` | 右下角浮動按鈕，主要動作 |
| **底部導覽列** | `config/navigation.ts` | 切換主要頁面 |
| **底部動作列** | `useBottomActions()` | 表單頁時**暫時取代**底部導覽列 |
| **snackbar** | `notify()` | 底部一閃即逝的訊息，全 App 一則 |
| **上下一筆箭頭** | `RecordNav` | 詳細頁左右兩側，浮在內容上 |

對話框（`ConfirmDialog`、`FieldsDialog`）與這些位置無關，一律蓋在畫面中央。

---

## 外殼與導覽

- **頂部 App Bar + 側邊欄外殼**。左側圖示依當下路由自動切換漢堡選單／返回箭頭——用 router 累計的導覽次數判斷有沒有真正的 App 內上一頁，沒有就不顯示返回箭頭
- **主要導覽用底部導覽列**，項目來自 `config/navigation.ts`；側邊欄先保留空殼
- 🔲 **桌面版導覽待定**：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定

---

## 列表

- **卡片式為主**（適合瀏覽），也支援表格式（適合比對、多選）
- **用 `<KeepAlive>` 保留展開與捲動狀態**，注意事項見 [architecture.md](architecture.md#keepalive-的規則)
- **長按進入多選模式**：選取狀態一有內容就自動進入、清空就自動離開，不另外存一個 boolean
- **頁籤列固定在 App Bar 底下**（`TabView` 登記給 `AppShell` 的 extension），不跟著內容捲動

---

## 動作擺在哪裡

| 位置 | 怎麼註冊 | 用途 |
| --- | --- | --- |
| 右下角 FAB | `<PageFab :actions="...">` | 主要動作。≤2 顆固定顯示，≥3 顆收合成 speed-dial |
| App Bar 右側 | `useAppBarActions()` | 次要動作。≤2 顆直接顯示，≥3 顆收成「⋮」下拉 |
| 螢幕最底端 | `useBottomActions()` | 表單的取消／送出，暫時取代底部導覽列，離開頁面自動還原 |
| 詳細頁的單一欄位 | `DataDetail` 的 `fieldActions` | 該欄的動作，右邊出現圖示、整格可點 |

- **四處共用同一種 `PageAction`**：`{ key, label, icon, onClick, confirm? }`。頁面自己決定用哪幾個、放哪裡
- **`icon` 一律要給**——底部動作列雖然只顯示文字，但形狀統一，同一個動作搬到別的位置不用補東西
- **內建 builder**（新增／編輯／刪除／批次刪除／ref 前往／開網址）的 `label` 與 `icon` 都有預設，要換就傳 `ActionLook`（`{ label?, icon? }`）覆寫。自訂的動作沒有預設，在各表的 `use表名Actions.ts` 裡宣告時自己給
- **欄位動作不是內建的**：ref 的「前往對方」跟開網址、改成今天一樣是 builder（`useGoToRefAction`／`useOpenUrlAction`／`useSetFieldAction`），要就列進去、不要就不列——沒有「空陣列代表內建」這種第三態
- **一次只有一個頁面的動作算數**：被 `<KeepAlive>` 收起來的頁面、以及 `TabView` 裡不是當前頁籤的面板，動作與 FAB 都會自動讓開（見 [TabView.md](components/TabView.md)），頁面自己不用判斷
- **需要確認的動作只要宣告 `confirm: { title, text }`**，不用自己擺 `ConfirmDialog`：`AppShell` 提供的 `runAction` 會先 `await confirm()`，說好才跑 `onClick`；`onClick` 拋錯一律進 snackbar

---

## 搜尋

頁面登記後 App Bar 才出現放大鏡，按下去整條 App Bar 換成「←＋輸入框」（淺灰藥丸形），標題與動作先讓位。

```ts
const query = ref('')
useAppBarSearch(query)
const data = useSearch(query, rows, schema)
```

- **`query` 是頁面的 ref**，`AppShell` 只負責讓使用者打字進去；過濾是頁面自己做的
- **比對 `searchable: true` 的 `text`／`ref` 欄位**（真實與虛擬都行，ref 比的是父列的名字）
- **分詞**：依空白切詞、雙引號包起來的當一個詞，每個詞都要命中（AND）
- **全部小寫比對**，不做全半形正規化
- **效能**：每列的可搜尋文字只在 rows 變時重算，敲字只做 `includes`
- **換頁自動收起**；回到還帶著 query 的頁面（KeepAlive）會自動重開，讓搜尋欄跟被過濾的列表一致
- **有頁籤的頁**先搜再依頁籤切，所以一個 query 跨所有頁籤

---

## 篩選

登記時多給 `{ tables: [{ schema, filters, rows }] }`，輸入框內最右側就多一顆篩選鈕（有條件生效時主色），按下去從右側滑出抽屜。

```ts
const filters = ref<Filters>({})
useAppBarSearch(query, { tables: [{ schema, filters, rows: allRows }] })
const data = useSearch(query, useFilter(filters, allRows, schema), schema)
```

- **改了即時生效**，沒有套用鈕；← 關閉搜尋時篩選一起清掉
- **篩選的對象是 `searchable: true` 的 `select`／`number`／`date`／`duration`**（`text`／`ref` 歸搜尋，兩邊用同一個開關）
- **欄位之間 AND、同一欄的多選之間 OR**
- **範圍條件**（number／date／duration）只填一邊就是單邊限制；值是空的列會被排除。時長換算成秒來比
- **select 多一個「(空白)」**，勾了才留空值的列
- **選項只列 `rows`（未過濾整表）裡出現過的值**，資料變了選項跟著變

### 抽屜是兩層的

| | 內容 |
| --- | --- |
| **第一層** | 可篩選欄位的清單（順序照 `detailOrder`）。有條件的欄位名稱底下用小字顯示現在篩什麼（`≥ 100`、`100 ～ 500`、`2026/01/01 ～`；select 是選到的值串起來，太長就截斷加「…共 X 項」），右側點一個主色圓點。「清除」在這一層，清掉整張表的條件 |
| **第二層** | 點一欄進去填值：select 是一列一項的 checkbox（「(空白)」排最後）、number／date／duration 是兩格範圍。← 回第一層 |

關掉抽屜也會回到第一層。抽屜開著時 `PageFab` 會讓開——它的 z-index 本來就在 layout 之上，靠 `useOverlay` 的 `overlayOpenKey` 通知。

### 一頁好幾張表

頁籤各接一張表時（見 [TabView.md](components/TabView.md)），`tables` 給多個元素：

```ts
useAppBarSearch(query, {
  tables: [
    { schema: parentSchema, filters: parentFilters, rows: allParents },
    { schema: childSchema, filters: childFilters, rows: allChildren },
  ],
  current: selectedTab,
})
```

- **每張表各自一份 `Filters`、同時生效**：各面板拿自己那份餵 `useFilter`，切頁籤不會把條件帶過去
- **搜尋字串全頁共用一份**，所以打一次字每個面板都跟著過濾
- **第一層上方多一排表的 chip**（標籤是 `schema.sheetName`）決定現在編哪一張；只有一張表就不顯示
- **`current` 是頁面的頁籤 `v-model`**（值對得上 `sheetName`），抽屜打開時先停在那張表，使用者還是可以自己切；關掉抽屜就忘掉，下次打開重新跟著頁籤
- **篩選鈕的主色標記掃所有表**；「清除」只清當前那張，要全部清掉就按 ←（關閉搜尋）

---

## 設計取捨

**為什麼表單的按鈕在螢幕最底端**
「取消／送出」永遠在拇指構得到的地方，不用把長表單捲到最後才按得到。而表單本來就是「要按到才算完成」的頁面，此時不該讓人分心去切分頁，所以它直接取代導覽列。

**為什麼 App Bar 動作走 provide/inject、FAB 走 Teleport**
App Bar 在轉場動畫的 `.page-transition-viewport` 之外，不會被 `transform` 影響，不需要真的搬 DOM；FAB 在頁面裡，得送出去才不會跟著頁面滑走。

**為什麼每一塊都是單一 setter**
三塊都走同一個 `registerActions`（`useActionSlot.ts`），同一時間只認一個頁面的動作。所以一定要靠 `isActive` 擋住被 KeepAlive 快取的頁面——它們仍然是全速運轉的（見 [architecture.md](architecture.md#keepalive-的規則)），動作一變就會蓋掉當前頁面的。

**為什麼 `confirm` 是宣告式、`askFields` 不是**
`confirm` 對每個動作都一樣、動作本體不需要知道結果，所以做成語法糖。`askFields` 的結果是動作要拿去用的，只能在 `onClick` 裡自己 `await`。

**ref 欄位那格為什麼是按鈕不是連結**
從 `<RouterLink>` 變成 `<button>` 之後中鍵開新分頁沒了，跟 `PageAction` 沒有 `to` 是同一個取捨（見 [schema.md](schema.md#設計取捨)）。導覽用 `push`，回來時 detail 還在。
