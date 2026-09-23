# ListField

`DataList` 內部的兩列四角排版（含多選勾選圖示）。**一般不用直接用**——它被抽出來只是為了讓 `DataList` 的連結版與非連結版共用同一份內容，沒有自己的邊框、內距、點擊行為。

## Usage

```vue
<script lang="ts" setup>
  import ListField from '@/components/ui/list/ListField.vue'
</script>

<template>
  <ListField
    bottom-left="文字3"
    bottom-right="文字4"
    :select-mode="selectMode"
    :selected="selected"
    title="文字1"
    top-right="文字2"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | **必填**，左上 |
| `topRight` | `string?` | 右上 |
| `bottomLeft` | `string?` | 左下 |
| `bottomRight` | `string?` | 右下 |
| `selectMode` | `boolean?` | 顯示勾選圈圈 |
| `selected` | `boolean?` | 勾選圈圈是否為已選狀態 |
