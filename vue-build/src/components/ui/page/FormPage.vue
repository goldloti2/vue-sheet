<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataForm from '@/components/ui/record/DataForm.vue'

  defineProps<{
    schema: TableSchema
    // 這一頁的欄位順序，覆寫 schema 的 formOrder（見 DataForm）
    order?: readonly string[]
    // 逐欄的錯誤訊息（useCreateForm／useEditForm 的 fieldErrors）
    errors?: Record<string, string>
    // 編輯頁才有：先把那一筆載進來
    loading?: boolean
    loadError?: string | null
    // 送出失敗的訊息，不經過 PageState，表單留在畫面上
    error?: string | null
  }>()

  // 新增頁不會是 null，編輯頁在載入中與找不到資料時是
  const model = defineModel<object | null>({ required: true })

  // 已有 id 即為修改既有的一筆（編輯頁），主鍵唯讀；新增頁的 id 在送出時才決定
  const lockId = computed(() => Boolean((model.value as { id?: string } | null)?.id))
</script>

<template>
  <div>
    <PageState :empty="!model" :error="loadError" :loading="loading">
      <!-- PageState 已經擋掉 null 了，這層只是讓型別看得出來 -->
      <template v-if="model">
        <DataForm
          v-model="model"
          :errors="errors"
          :lock-id="lockId"
          :order="order"
          :schema="schema"
        />

        <v-container v-if="error">
          <v-alert :text="error" type="error" />
        </v-container>

        <!-- 這張表額外要放的東西（說明、預覽…）；一般不用 -->
        <slot :row="model" />
      </template>
    </PageState>
  </div>
</template>
