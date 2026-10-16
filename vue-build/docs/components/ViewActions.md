# ViewActions

view 的列上動作（`actions`）的呈現元件，依 `variant` 提供三種排法。`row` 與 `menu` 略過 `null`，`slots` 將其保留為空格；沒有任何動作時不渲染。按下後交由 `useRunAction` 執行，`confirm` 與錯誤提示皆會生效（見 [actions.md](../actions.md#列上的動作)）。

| `variant` | 排法 | 使用者 |
| --- | --- | --- |
| `row`（預設） | 依陣列順序由左往右排列、整組靠右 | deck |
| `menu` | 收入 ⋮ 選單，依陣列順序由上往下排列，每項顯示圖示與 `label` | profile、gallery |
| `slots` | 左右各兩格：前兩個靠左、後兩個靠右，`null` 保留為空格，超過四個的部分不顯示 | card、detail 標頭 |

**一般不需要直接使用**：[DataList](DataList.md) 已將 `row` 置於右下角欄位的下一列，並在多選模式下隱藏；[DataProfile](DataProfile.md) 已將 `menu` 置於卡片右側，[DataGallery](DataGallery.md) 已將 `menu` 置於格子右下角；[DataCard](DataCard.md) 已將 `slots` 置於第 4 層，[DetailHeader](DetailHeader.md) 已將 `slots` 置於圖片下方。

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
| `actions` | `(PageAction \| null)[]` | **必填**，view 回傳的該列動作；`null` 的處理見上表 |
| `variant` | `'row' \| 'menu' \| 'slots'` | 預設 `'row'`，見上表 |

## 備註

- **`display`**：適用於 `row` 與 `slots`。`'text'` 以主色文字顯示；其餘（含未指定）以圖示顯示，並以 `label` 作為 `aria-label`。`menu` 一律同時顯示圖示與文字；選單帶有 `action-menu` class，圖示與文字的間距縮小為 20px，圖示不套用 `v-list-item` 預設的中等強調透明度，與其他位置的圖示同樣深淺。App Bar 的 ⋮ 選單亦帶有此 class，樣式定義於 `src/styles/list.css`
- **`menu` 的選單於第一次按下 ⋮ 時才掛上**：每列僅有一顆原生按鈕，`v-menu` 在該列第一次開啟時才建立，之後的開關交由 `v-menu` 綁定於該按鈕的事件處理。上千列的列表因此不會有上千個 `v-menu` 實例
- **按鈕為原生 `<button>` 加 `v-icon`，而非 `v-btn`**：deck 可能有上千列，`v-btn` 的實例成本較高；且即使未設定 `to`，`v-btn` 仍會呼叫 vue-router 的 `useLink`，開發版中每次導覽都會因此重新計算。按鈕不帶波紋等效果
- **放不下時換行**：`row` 與 `slots` 皆為 `flex-wrap`，一般頁面中放得下，不會換行
- **dashboard 中的窄版**：位於 dashboard 的面板中時，`'text'` 的按鈕另繪一個圖示並一律帶 `aria-label`；所在面板寬度小於 200px（3 格以下）時改顯示圖示，外觀與其他圖示按鈕相同；此時整列靠左，`slots` 不分左右、不保留空格（見 [dashboard.md](../dashboard.md) 的「面板內容的寬度」）。一般頁面不繪這個圖示，上千列的列表不會多出同樣數量的 `v-icon`
