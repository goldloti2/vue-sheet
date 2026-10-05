# 附錄：列表效能量測

一千多筆的真實資料接上來之後，導覽列切換頁面「按下去到動畫開始」有明顯延遲（2026-10-03 量）。這份記錄當時的數字、量測方法、三個改動各自的效果，以及還沒做的部分。

> **當時的資料量**：兩張互為父子的表，父表約 1300 筆（列表當時顯示其中 773 筆）、子表 1306 筆。子表的列表每一列都顯示所屬父列的名字。
> **環境**：`npm run dev` 的開發版 Vue，所以**絕對值偏悲觀**（開發版的渲染開銷比 build 版高好幾倍），這裡有意義的是同一台機器上的相對變化。

---

## 怎麼量的

三段暫時的程式碼，量完就拿掉了。要重現就照這個加回去。

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

// enter hook：guard + 重新渲染 + patch 都做完了。之後兩帧是 Vue 換上 -enter-to、動畫真的開始跑
function onEnter (): void {
  mark('enter hook')
  requestAnimationFrame(() => {
    mark('frame 1')
    requestAnimationFrame(() => mark('frame 2（動畫開始）'))
  })
}

// 只有超過 50ms 的任務會進來，就是卡住動畫的那些
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log('  longtask', Math.round(entry.duration), 'ms')
  }
}).observe({ entryTypes: ['longtask'] })
```

把 `onEnter` 掛上 `<transition name="page" @enter="onEnter">`，再在 `useSearch` 的 `indexed` computed 裡包一組 `performance.now()`，印出「哪張表、幾列、幾毫秒」。

**判讀方式**：

| 看什麼 | 代表 |
| --- | --- |
| `frame 2` 的毫秒數 | 使用者感覺到的那段延遲（按下去到動畫開始） |
| `enter hook` | guard + Vue 重新渲染 + patch 的總時間，也就是 JS 那一半 |
| `enter hook` → `frame 1` 的差距 | 瀏覽器的 style/layout/paint，跟元件與 DOM 節點數成正比 |
| `searchIndex` 有沒有印 | **沒印就代表資料層完全沒參與這次導覽**（computed 沒失效），是分辨「資料層 vs 渲染」最快的訊號 |

---

## 數字

### 回到已被 KeepAlive 快取的列表（773 列）

最乾淨的指標：沒有資料載入、沒有元件掛載，`searchIndex` 從頭到尾沒印過。

| | 原始 | ① 不用 RouterLink | ② ref 加 id 索引 | ③ content-visibility |
| --- | --- | --- | --- | --- |
| enter hook | 177ms | 80ms | 67ms | 70ms |
| frame 1 | 396ms | 311ms | 304ms | 237ms |
| **frame 2（動畫開始）** | **408ms** | 323ms | 316ms | **255ms** |
| 排版（enter hook → frame 1） | 219ms | 231ms | 237ms | **167ms** |
| 最大 longtask | 381ms | 284ms | 289ms | 219ms |

### 首次掛載一張 1306 列的列表

| | 原始 | ① | ② | ③ |
| --- | --- | --- | --- | --- |
| searchIndex | 56ms | 34ms | 11ms | 10ms |
| enter hook | 543ms | 375ms | 365ms | 386ms |
| frame 1 | 975ms | 955ms | 781ms | 495ms |
| **frame 2（動畫開始）** | **1001ms** | 986ms | 812ms | **568ms** |
| 排版（enter hook → frame 1） | 432ms | 580ms | 416ms | **109ms** |
| 最大 longtask | 794ms | 810ms | 614ms | 450ms |

### 首次載入（掛載 + 兩張表的 fetch）

這組含網路與 `coerceRow`，雜訊大，只當參考：`frame 2` 從 805ms 到 766ms，`searchIndex` 一直都是 3～14ms（773 列）。

> 這組會看到 `searchIndex` 對同一張表印兩到三次：先是 0 列（資料還沒到），自己那張表載完算一次，**子表載完再算一次**——父表那幾個虛擬欄位是從子列算出來的，子表一到就得重算。這是預期行為。

---

## 三個改動

### ① 列表的每一列不要用 `RouterLink`

`RouterLink` 內部有個讀 `currentRoute` 的 computed，所以**列表有幾列就有幾個會在每次導覽失效重算**。兩個快取頁面加起來約 2000 個，就是快取導覽那 177ms 的主要來源。改成自己組 `href` 的 `<a>`、點擊才 `router.push`（`DataList`，中鍵與 ctrl 點擊的原生行為保留）。

效果：`enter hook` 177 → 80ms。

### ② `ref` 的父列查詢加 id 索引

`row.$欄位key` 原本是 `rows[父表].find(...)`，每讀一次掃一次整張父表。子表的列表每一列都顯示父列名字，所以光是渲染就是 1306 × 1300 ≈ 170 萬次比較（約 56ms，數量級吻合）。改成跟子列索引同一個模式的 `computed` Map（`rowGetters.ts`）。

效果：`searchIndex` 34 → 11ms，掛載頁的 `frame 2` 跟著掉 174ms。順帶一提，`ref` 是空值時原本也會白掃一遍，現在直接短路。

### ③ `.list-item` 加 `content-visibility: auto`

```css
content-visibility: auto;
contain-intrinsic-size: auto 72px;
```

畫面外的列不排版也不繪製。沒有動任何元件架構、視窗捲動與捲動位置還原照舊、分組與子表區塊通吃。

效果：掛載頁的排版 416 → 109ms（-74%），快取頁 237 → 167ms（-30%）。差別在於快取頁是把整棵樹重新插回文件，每列**自己的盒子**還是要參與一次排版，省掉的只有列內容那幾層。

---

## 還沒做的

剩下的成本分佈：

- **掛載頁的 386ms `enter hook`**：Vue 建 1306 列 × 約 3 個元件實例。只有「別建那麼多」能解
- **快取頁的 167ms 排版**：773 個列盒子，同上
- **快取頁的 70ms JS**：還沒拆解過。嫌疑是 KeepAlive 啟用那一串（`useListOrder` 重新發布幾百個 id、`useListControls` 重新登記、`TabView` 那套），以及列表頁 template 裡每次 render 都重跑的過濾／分組函式（寫成函式而不是 computed 的話）

可能的下一步，照效益排序：

| | 做什麼 | 代價 |
| --- | --- | --- |
| 虛擬捲動 | 只渲染可見範圍的列 | 大。Vuetify 的 `v-virtual-scroll` 會把捲動軸搬進容器裡，`scrollBehavior` 的捲動位置還原、App Bar 的行為、分組標題都要重做；自己做視窗式虛擬捲動則需要固定列高 |
| 漸進渲染 | 先畫 100 列，捲到底再長 | 中。不用固定列高、保留視窗捲動，但「捲到很深再回來」還是會回到原本的成本 |
| 收起來的群組不渲染 | `GroupedList` 自己記哪幾組開著，收起來的內容用 `v-if` 拿掉（見下方） | 小，只動一個元件、不改 UI。但只幫到有分組的頁面，單一組很大時也沒用 |
| `TabView` 只掛當前面板 | 看過的頁籤目前會一直留在 DOM 裡 | 中，會失去面板狀態（捲動位置、展開狀態） |
| 頁面裡的過濾／分組改 computed | 頁面自己的事，順手 | 小 |

**收起來的群組現在其實全部都建了**：`v-list-group` 在 `v-list` 的 `itemsRegistration` 是預設的 `'render'` 時，收起來的內容照樣渲染、只用 `v-show` 藏起來（`VListGroup.js` 的 `renderWhenClosed`）。所以分組全收著，每一列的元件實例還是全建好了，收合只省到排版（`display: none` 本來就不排版），省不到上面那塊最大的 `enter hook`。改成不展開就不建之後，首次掛載只剩群組頭加上展開的那一組。

AppSheet 那種「點開一組後畫面上只剩那一組」的呈現是另一回事：多藏起來的只是其他幾十個群組頭，效能上幾乎沒差，要不要做是 UI 的選擇。

**動手前先重新量一次**：上面每一條的效益都該像這份記錄一樣有前後數字，而且**建議用 `npm run build && npm run preview` 再量一遍**——開發版的渲染開銷不成比例，有可能做了白工。
