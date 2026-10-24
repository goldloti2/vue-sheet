# ListField

`DataList` 內部的排版：左側為縮圖，右側為兩行四個角的位置，並含多選的勾選圖示。**一般無須直接使用此元件**。`DataList` 先以 view 將一列解析為各位置的內容（`view(row)`，見 [DataList](DataList.md)），再交由此元件呈現。此元件不含邊框、內距與點擊行為，也不處理列與 schema。

## Usage

```vue
<script lang="ts" setup>
  import ListField from '@/components/ui/list/ListField.vue'

  const fields = computed(() => view(row))
</script>

<template>
  <ListField
    :aside="fields.aside"
    :image="fields.image"
    :subtitle="fields.subtitle"
    :summary="fields.summary"
    :title="fields.title"
  />
</template>
```

## Props

位置的名稱與 view 相同。
- 未指定的位置為 `undefined`，不顯示，也不佔位置
- 已指定但沒有值的文字，其 `text` 為空字串，保留一行的高度
- 上下兩行中，某一行的兩個位置皆未指定時，整行不顯示
- 文字位置為 view 算出的 `DisplayValue`（文字與條件式格式），由 [FormattedValue](../view/FormattedValue.md) 顯示

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `DisplayValue?` | 左上 |
| `subtitle` | `DisplayValue?` | 右上 |
| `summary` | `DisplayValue?` | 左下 |
| `aside` | `DisplayValue?` | 右下 |
| `image` | `(string \| null)?` | 左側 48×48 的縮圖，須為已轉換的 src。為 `null` 時保留同大小的空白，為 `undefined` 時不顯示 |
| `selectMode` | `boolean?` | 顯示勾選圖示 |
| `selected` | `boolean?` | 勾選圖示是否為已選取的狀態 |
