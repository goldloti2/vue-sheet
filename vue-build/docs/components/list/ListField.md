# ListField

`DataList` 內部的排版：左側為縮圖，右側為兩列四角（含多選的勾選圖示）。**一般不需要直接使用**：`DataList` 先以 view 將一列解析為字串（`view(row)`，見 [DataList](DataList.md)），再交由本元件呈現。本元件不含邊框、內距與點擊行為，也不處理 row 與 schema。

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

位置的名稱與 view 相同。沒指定的位置為 `undefined`，不顯示也不佔位置；指定了但沒有值的文字為 `text` 空字串，保留一行的高度。上下兩行各自在兩個位置都沒指定時整行不顯示。文字位置為 view 算出的 `DisplayValue`（文字與條件式格式），以 [FormattedValue](../view/FormattedValue.md) 畫出。

| prop | 型別 | 說明 |
| --- | --- | --- |
| `title` | `DisplayValue?` | 左上 |
| `subtitle` | `DisplayValue?` | 右上 |
| `summary` | `DisplayValue?` | 左下 |
| `aside` | `DisplayValue?` | 右下 |
| `image` | `(string \| null)?` | 左側 48×48 的縮圖，須為已轉換的 src；為 `null` 時留一塊同大小的空白，`undefined` 時不顯示 |
| `selectMode` | `boolean?` | 顯示勾選圈圈 |
| `selected` | `boolean?` | 勾選圈圈是否為已選狀態 |
