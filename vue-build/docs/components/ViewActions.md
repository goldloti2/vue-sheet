# ViewActions

view 的列上動作（`actions`）的呈現元件：依陣列順序由左往右排列、整組靠右，`null` 會略過；略過後沒有任何動作時不渲染。按下後交由 `useRunAction` 執行，`confirm` 與錯誤提示皆會生效（見 [actions.md](../actions.md#列上的動作)）。

**一般不需要直接使用**：[DataList](DataList.md) 已將它置於右下角欄位的下一列，並在多選模式下隱藏。目前僅提供 deck 的排法；profile 的 ⋮ 選單，以及 card 與 detail 標頭的左右各兩格，日後於本元件擴充（見 ROADMAP 的「頁面類型」）。

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

## 備註

- **`display`**：`'text'` 以主色文字顯示；其餘（含未指定）以圖示顯示，並以 `label` 作為 `aria-label`
- **按鈕為原生 `<button>` 加 `v-icon`，而非 `v-btn`**：deck 可能有上千列，`v-btn` 的實例成本較高；且即使未設定 `to`，`v-btn` 仍會呼叫 vue-router 的 `useLink`，開發版中每次導覽都會因此重新計算。按鈕不帶波紋等效果
