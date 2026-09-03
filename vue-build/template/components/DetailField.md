# DetailField

單一欄位的「標籤 + 值」一列。`DataDetail` 內部就是用它，**一般 detail 頁不用直接碰**——需要在 detail 區塊外另外顯示欄位時才用。給了 `to` 值就變成連結，右邊自動加箭頭圖示。

## Usage

```vue
<script lang="ts" setup>
  import DetailField from '@/components/ui/DetailField.vue'
</script>

<template>
  <DetailField label="標籤" to="/路徑" value="內容" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `label` | `string` | **必填**，左側標籤 |
| `value` | `string` | **必填**，已格式化好的字串 |
| `to` | `string?` | 有給就變連結 |
