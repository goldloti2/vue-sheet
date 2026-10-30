# ViewActions

view 中列上動作（`actions`）的呈現元件，依 `variant` 提供三種排法。
- `row` 與 `menu` 略過 `null`，`slots` 將 `null` 保留為空格
- 沒有任何動作時不顯示
- 按下後交由 `useRunAction` 執行，`confirm` 與錯誤提示皆會生效（見 [actions.md](../../topics/actions.md#列上的動作)）

| `variant` | 排法 | 使用者 |
| --- | --- | --- |
| `row`（預設） | 依陣列順序由左往右排列，整組靠右 | deck |
| `menu` | 收入 ⋮ 選單，依陣列順序由上往下排列，每一項顯示圖示與 `label` | profile、gallery |
| `slots` | 左右各兩格：前兩格靠左，後兩格靠右，`null` 保留為空格，第五個以後不顯示 | card、詳細頁的標頭 |

**一般無須直接使用此元件**，各版面元件已放置：

| 元件 | variant | 位置 |
| --- | --- | --- |
| [DataList](../list/DataList.md) | `row` | 右下角欄位的下一行，多選模式下隱藏 |
| [DataProfile](../list/DataProfile.md) | `menu` | 卡片右側 |
| [DataGallery](../list/DataGallery.md) | `menu` | 格子右下角 |
| [DataCard](../list/DataCard.md) | `slots` | 第 4 層 |
| [DetailHeader](../record/DetailHeader.md) | `slots` | 圖片下方 |

## Usage

```vue
<script lang="ts" setup>
  import ViewActions from '@/components/ui/view/ViewActions.vue'

  const fields = computed(() => view(row))
</script>

<template>
  <ViewActions :actions="fields.actions" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `actions` | `(PageAction \| null)[]` | **必填**，view 回傳的這一列的動作。`null` 的處理見上表 |
| `variant` | `'row' \| 'menu' \| 'slots'` | 預設 `'row'`，見上表 |

## 備註

- **`display`**：適用於 `row` 與 `slots`
  - `'text'` 以主色文字顯示
  - 其餘值（包括未指定）以圖示顯示，並以 `label` 作為 `aria-label`
- **`menu` 的樣式**：
  - 一律同時顯示圖示與文字
  - 選單帶有 `action-menu` class：圖示與文字的間距縮小為 20px，圖示不套用 `v-list-item` 預設的中等強調透明度，與其他位置的圖示深淺相同
  - App Bar 的 ⋮ 選單也帶有此 class。樣式定義於 `src/styles/list.css`
- **`menu` 的選單於第一次按下 ⋮ 時才掛上**：每一列平時只有一個原生按鈕。`v-menu` 在該列第一次開啟時才建立，之後的開關交由 `v-menu` 綁定於該按鈕的事件處理
- **按鈕為原生 `<button>` 加上 `v-icon`，不是 `v-btn`**，沒有波紋等效果
- **放不下時換行**：`row` 與 `slots` 皆為 `flex-wrap`。一般頁面中放得下，不會換行
- **dashboard 中的窄版**：
  - 位於 dashboard 的面板中時，`'text'` 的按鈕另外繪製一個圖示，並一律帶有 `aria-label`。一般頁面不繪製這個圖示
  - 所在面板為[窄面板](../../design/dashboard.md#窄面板)時，`'text'` 的按鈕改為顯示圖示，外觀與其他圖示按鈕相同
  - 此時整行靠左，`slots` 不分左右，也不保留空格
