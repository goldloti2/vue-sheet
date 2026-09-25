<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataForm from '@/components/ui/record/DataForm.vue'

  defineProps<{
    schema: TableSchema
    // 逐欄的錯誤訊息（useCreateForm／useEditForm 的 fieldErrors）
    errors?: Record<string, string>
    // 編輯頁才有：先把那一筆載進來
    loading?: boolean
    loadError?: string | null
    // 送出失敗的訊息，表單要留在畫面上所以不走 PageState
    error?: string | null
  }>()

  // 新增頁不會是 null，編輯頁在載入中與找不到資料時是
  const model = defineModel<object | null>({ required: true })
</script>

<template>
  <PageState :empty="!model" :error="loadError" :loading="loading">
    <!-- PageState 已經擋掉 null 了，這層只是讓型別看得出來 -->
    <template v-if="model">
      <DataForm v-model="model" :errors="errors" :schema="schema" />

      <v-container v-if="error">
        <v-alert :text="error" type="error" />
      </v-container>

      <!-- 這張表額外要放的東西（說明、預覽…）；一般不用 -->
      <slot :row="model" />
    </template>
  </PageState>
</template>
