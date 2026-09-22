# DetailField

單一欄位的「標籤 + 值」一列。`DataDetail` 內部就是用它，**一般 detail 頁不用直接碰**——需要在 detail 區塊外另外顯示欄位時才用。給了 `action` 就變成可點的一格，右邊顯示動作的圖示，按下去走 `runAction`（`confirm`、錯誤 snackbar 都有）。

## Usage

```vue
<script lang="ts" setup>
  import DetailField from '@/components/ui/record/DetailField.vue'
</script>

<template>
  <DetailField :action="action" label="標籤" value="內容" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `label` | `string` | **必填**，左側標籤 |
| `value` | `string` | **必填**，已格式化好的字串 |
| `action` | `PageAction?` | 有給就整格可點，右邊顯示圖示 |
