# 附錄：列表效能量測

接上一千多列的真實資料後，以導覽列切換頁面時，從按下到動畫開始有明顯的延遲（2026-10-03 量測）。此文件記錄當時的數字、量測方法、三個改動各自的效果，以及尚未進行的部分。

> **當時的資料量**：兩張互為父子的表。父表約 1300 列，列表當時顯示其中 773 列。子表 1306 列。子表列表的每一列皆顯示所屬父列的名稱。
>
> **環境**：`npm run dev` 的開發版 Vue。開發版的渲染開銷比 build 版高好幾倍，因此**絕對值偏高**。此處有意義的是同一台機器上的相對變化。

---

## 量測方法

量測使用三段暫時的程式碼，量測後即移除。須重現時，依下述方式加回。

`App.vue` 的 `<script setup>`：

```ts
const router = useRouter()
let navStart = 0
router.beforeEach(() => {
  navStart = performance.now()
  console.log('--- nav')
})

function mark (tag: string): void {
  console.log(`  ${tag}`, Math.round(performance.now() - navStart), 'ms')
}

// enter hook：guard、重新渲染與 patch 皆已完成。之後兩幀為 Vue 換上 -enter-to、動畫開始
function onEnter (): void {
  mark('enter hook')
  requestAnimationFrame(() => {
    mark('frame 1')
    requestAnimationFrame(() => mark('frame 2（動畫開始）'))
  })
}

// 只記錄超過 50ms 的任務，即卡住動畫的任務
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log('  longtask', Math.round(entry.duration), 'ms')
  }
}).observe({ entryTypes: ['longtask'] })
```

- 把 `onEnter` 掛上 `<transition name="page" @enter="onEnter">`
- 在 `useSearch` 的 `indexed` computed 中包一組 `performance.now()`，印出「哪張表、幾列、幾毫秒」

**判讀方式**：

| 數值 | 代表的意義 |
| --- | --- |
| `frame 2` 的毫秒數 | 使用者感覺到的延遲，即從按下到動畫開始 |
| `enter hook` | guard、Vue 重新渲染與 patch 的總時間，即 JS 的部分 |
| `enter hook` 到 `frame 1` 的差距 | 瀏覽器的 style、layout、paint，與元件及 DOM 節點數成正比 |
| 是否印出 `searchIndex` | **未印出即表示資料層完全沒有參與這次導覽**（computed 沒有失效）。這是分辨「資料層或渲染」最快的訊號 |

---

## 數字

### 回到已由 KeepAlive 快取的列表（773 列）

這是最單純的指標：沒有載入資料，沒有掛載元件，`searchIndex` 從頭到尾沒有印出。

| | 原始 | ① 不使用 RouterLink | ② ref 加上 id 索引 | ③ content-visibility |
| --- | --- | --- | --- | --- |
| enter hook | 177ms | 80ms | 67ms | 70ms |
| frame 1 | 396ms | 311ms | 304ms | 237ms |
| **frame 2（動畫開始）** | **408ms** | 323ms | 316ms | **255ms** |
| 排版（enter hook → frame 1） | 219ms | 231ms | 237ms | **167ms** |
| 最大的 longtask | 381ms | 284ms | 289ms | 219ms |

### 首次掛載一張 1306 列的列表

| | 原始 | ① | ② | ③ |
| --- | --- | --- | --- | --- |
| searchIndex | 56ms | 34ms | 11ms | 10ms |
| enter hook | 543ms | 375ms | 365ms | 386ms |
| frame 1 | 975ms | 955ms | 781ms | 495ms |
| **frame 2（動畫開始）** | **1001ms** | 986ms | 812ms | **568ms** |
| 排版（enter hook → frame 1） | 432ms | 580ms | 416ms | **109ms** |
| 最大的 longtask | 794ms | 810ms | 614ms | 450ms |

### 首次載入（掛載與兩張表的 fetch）

這組包含網路與 `coerceRow`，雜訊大，只作參考：`frame 2` 從 805ms 降至 766ms，`searchIndex` 一直為 3～14ms（773 列）。

> 這組的 `searchIndex` 對同一張表印出兩到三次：
> 1. 先為 0 列，資料尚未取得
> 2. 自己這張表載入後，計算一次
> 3. **子表載入後，再計算一次**：父表的幾個虛擬欄位由子列算出，子表一到即須重算
>
> 這是預期的行為。

---

## 三個改動

### ① 列表的每一列不使用 `RouterLink`

`RouterLink` 內部有一個讀取 `currentRoute` 的 computed，因此**列表有幾列，每次導覽就有幾個 computed 失效重算**。兩個快取頁面加起來約 2000 個，即為快取導覽那 177ms 的主要來源。

改法：自行組成帶 `href` 的 `<a>`，點擊時才呼叫 `router.push`（`DataList`）。中鍵與 ctrl 點擊的原生行為保留。

效果：`enter hook` 從 177ms 降至 80ms。

### ② `ref` 的父列查詢加上 id 索引

`row.$欄位key` 原本為 `rows[父表].find(...)`，每讀取一次就掃描一次整張父表。子表列表的每一列皆顯示父列的名稱，因此渲染本身即為 1306 × 1300 ≈ 170 萬次比較，約 56ms，數量級吻合。

改法：改為與子列索引相同模式的 `computed` Map（`rowGetters.ts`）。

效果：
- `searchIndex` 從 34ms 降至 11ms，掛載頁的 `frame 2` 隨之減少 174ms
- `ref` 為空值時，原本也會白白掃描一次，現在直接略過

### ③ `.list-item` 加上 `content-visibility: auto`

```css
content-visibility: auto;
contain-intrinsic-size: auto 72px;
```

瀏覽器不排版、不繪製畫面外的列。此改動不改變任何元件的架構。視窗捲動與捲動位置的還原照舊，分組與子表區塊皆適用。

效果：
- 掛載頁的排版從 416ms 降至 109ms（-74%）
- 快取頁從 237ms 降至 167ms（-30%）
- 兩者的差別：快取頁是把整棵樹重新插回文件，每一列**本身的盒子**仍須參與一次排版，省下的只有列內容的那幾層

---

## 拆分頁籤頁的推算

將依狀態分頁籤的列表頁，拆成頁籤頁與 `_ref/` 中的單純列表（以 `scope` 只保留各自的列，見 [search.md](topics/search.md#同一頁面中的多張表)）時的推算。此推算尚未依上述方法量測：

| | 拆分前 | 拆分後 |
| --- | --- | --- |
| 首次開啟 | 處理整張表，再切出第一個頁籤 | 只掛上第一個頁籤的列表，只處理該狀態的列 |
| 每次輸入搜尋 | 比對整張表一次 | 看過的各頁籤各自比對自己的範圍，合計相同 |
| 依頁籤切分 | 寫成於 template 中呼叫的函數時，每次重新渲染皆重新篩選 | `scope` 位於 computed 中，只在資料變動時重算 |
| 篩選抽屜的選項 | 掃描整張表一次 | 同一張表共用，同樣只掃描一次 |

---

## 尚未進行的部分

剩下的成本分佈：

- **掛載頁的 386ms `enter hook`**：Vue 建立 1306 列 × 約 3 個元件實例。只有減少建立的數量才能解決
- **快取頁的 167ms 排版**：773 個列的盒子，解法同上
- **快取頁的 70ms JS**：尚未拆解。可能的來源：
  - KeepAlive 啟用時的一連串處理：`useListControls` 重新登記、`TabPage` 的相關處理
  - 列表頁 template 中每次渲染都重新執行的過濾或分組函數（寫成函數而非 computed 時）

可能的下一步，依效益排序：

| | 做法 | 代價 |
| --- | --- | --- |
| 虛擬捲動 | 只渲染可見範圍的列 | 大。Vuetify 的 `v-virtual-scroll` 把捲動軸移入容器中，`scrollBehavior` 的捲動位置還原、App Bar 的行為、分組標題都須重做。自行實作視窗式虛擬捲動，則須固定列高 |
| 漸進渲染 | 先顯示 100 列，捲到底再增加 | 中。無須固定列高，保留視窗捲動。但捲到很深再回來時，仍回到原本的成本 |
| 不渲染收合的群組 | `GroupedList` 自行記錄哪幾組展開，收合的內容以 `v-if` 移除（見下方） | 小，只修改一個元件，不改變 UI。但只對有分組的頁面有效，單一組很大時也無效 |
| `TabPage` 只掛載目前的面板 | 看過的頁籤目前一直留在 DOM 中 | 中。會失去面板的狀態，例如捲動位置、展開狀態 |
| 頁面中的過濾與分組改為 computed | 由頁面自行處理 | 小 |

**收合的群組目前其實全部建立**：
- `v-list` 的 `itemsRegistration` 為預設的 `'render'` 時，`v-list-group` 收合的內容照樣渲染，只以 `v-show` 隱藏（`VListGroup.js` 的 `renderWhenClosed`）
- 因此分組全部收合時，每一列的元件實例仍全部建立。收合只省下排版（`display: none` 本身不排版），省不到上述最大的 `enter hook`
- 改為不展開即不建立之後，首次掛載只剩群組標題加上展開的那一組

AppSheet 那種「點開一組後，畫面上只剩那一組」的呈現是另一回事：多隱藏的只是其他幾十個群組標題，效能上幾乎沒有差別，是否採用屬於 UI 的選擇。

**動手前先重新量測**：上述每一項的效益都應比照此文件，留下前後的數字。**建議以 `npm run build && npm run preview` 再量一次**：開發版的渲染開銷不成比例，可能白做工。
