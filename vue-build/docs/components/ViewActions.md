# ViewActions

view 的列上動作（`actions`）的呈現元件，依 `variant` 提供兩種排法，`null` 皆會略過；略過後沒有任何動作時不渲染。按下後交由 `useRunAction` 執行，`confirm` 與錯誤提示皆會生效（見 [actions.md](../actions.md#列上的動作)）。

| `variant` | 排法 | 使用者 |
| --- | --- | --- |
| `row`（預設） | 依陣列順序由左往右排列、整組靠右 | deck |
| `menu` | 收入 ⋮ 選單，依陣列順序由上往下排列，每項顯示圖示與 `label` | profile |

**一般不需要直接使用**：[DataList](DataList.md) 已將 `row` 置於右下角欄位的下一列，並在多選模式下隱藏；[DataProfile](DataProfile.md) 已將 `menu` 置於卡片右側。card 與 detail 標頭的左右各兩格，日後於本元件擴充（見 ROADMAP 的「頁面類型」）。

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
| `actions` | `(PageAction \| null)[]` | **必填**，view 回傳的該列動作；`null` 略過 |
| `variant` | `'row' \| 'menu'` | 預設 `'row'`，見上表 |

## 備註

- **`display`**：僅適用於 `row`。`'text'` 以主色文字顯示；其餘（含未指定）以圖示顯示，並以 `label` 作為 `aria-label`。`menu` 一律同時顯示圖示與文字
- **`menu` 的選單於第一次按下 ⋮ 時才掛上**：每列僅有一顆原生按鈕，`v-menu` 在該列第一次開啟時才建立，之後的開關交由 `v-menu` 綁定於該按鈕的事件處理。上千列的列表因此不會有上千個 `v-menu` 實例
- **按鈕為原生 `<button>` 加 `v-icon`，而非 `v-btn`**：deck 可能有上千列，`v-btn` 的實例成本較高；且即使未設定 `to`，`v-btn` 仍會呼叫 vue-router 的 `useLink`，開發版中每次導覽都會因此重新計算。按鈕不帶波紋等效果
