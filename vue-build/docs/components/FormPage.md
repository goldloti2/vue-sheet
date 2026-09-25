# FormPage

新增頁與編輯頁的整頁版型：載入中、載入失敗、找不到資料、表單本體、送出錯誤，五種狀態一次包好。表單欄位本身是 `DataForm`，這層只管外圍。

搭 `useCreateForm`／`useEditForm` 用，兩者回傳的東西直接對應這裡的 prop——**新增頁沒有載入那一段，省略 `loading`／`load-error` 就好**。取消與送出兩顆按鈕不用管，那兩個 composable 自己掛到底部動作列。

## Usage

```vue
<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import FormPage from '@/components/ui/page/FormPage.vue'
  import { useEditForm } from '@/composables/form/useTableForm'
  import { useRouteId } from '@/composables/navigation/useRouteId'
  import { __table__Schema } from '@/schema/__table__'

  const { form, fieldErrors, loading, loadError, error }
    = useEditForm<__Table__Row>('__table__', __table__Schema, useRouteId())
</script>

<template>
  <FormPage
    v-model="form"
    :error="error"
    :errors="fieldErrors"
    :load-error="loadError"
    :loading="loading"
    :schema="__table__Schema"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `object \| null` | **必填**，表單的 row。`null` 時顯示「找不到這筆資料」 |
| `schema` | `TableSchema` | **必填**，決定有哪些欄位、順序與輸入元件 |
| `errors` | `Record<string, string>?` | 逐欄的錯誤訊息（`fieldErrors`） |
| `loading` | `boolean?` | 編輯頁載入那一筆的期間 |
| `loadError` | `string \| null?` | 載入失敗的訊息 |
| `error` | `string \| null?` | 送出失敗的訊息，顯示在表單底下 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 表單底下額外要放的東西（說明、預覽…）。一般不用，只有這張表要的東西才放 |

## 備註

- **狀態的優先順序**是 loading → loadError → 找不到資料 → 表單，跟資料實際到手的順序一致；那三種狀態本身是交給 [PageState](PageState.md) 畫的
- 「找不到這筆資料」用的是 `warning` 而不是 `error`：網址打錯或資料被刪掉都算正常情況
- 欄位級的錯誤訊息由 `DataForm` 顯示在各欄底下，這裡的 `error` 是整張表單層級的（送出失敗、後端錯誤）
