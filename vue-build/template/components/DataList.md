# DataList

卡片式列表的**單一列**，四個角落各一個欄位。自己不做迴圈，外面用 `v-for` 或包在 `GroupedList` 的 slot 裡。給了 `to` 整列就是連結。

## Usage

```vue
<script lang="ts" setup>
  import DataList from '@/components/ui/DataList.vue'
</script>

<template>
  <DataList
    bottom-left="文字3"
    bottom-right="文字4"
    :select-mode="selectMode"
    selectable
    :selected="selected"
    title="文字1"
    to="/路徑"
    top-right="文字2"
    @longpress="handleLongpress"
    @toggle="handleToggle"
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
| `to` | `string?` | 有給才是連結；沒給就是純顯示的一列 |
| `selectable` | `boolean?` | 預設 `false`。開了才綁長按監聽、才會禁止文字選取與拖曳 |
| `selectMode` | `boolean?` | 目前在不在多選模式 |
| `selected` | `boolean?` | 這一列有沒有被選 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按觸發，只有 `selectable` 時會發 |
| `toggle` | 多選模式下點擊觸發；此時不會導覽 |
