<script lang="ts" setup>
  import type { TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataForm from '@/components/ui/record/DataForm.vue'

  const props = withDefaults(defineProps<{
    schema: TableSchema
    // 這一頁的欄位順序，覆寫 schema 的 formOrder（見 DataForm）
    order?: readonly string[]
    // 主鍵欄是否唯讀。省略時依是否修改既有的列自動判斷
    lockId?: boolean
    // 各欄的錯誤訊息（useCreateForm、useEditForm 的 fieldErrors）
    errors?: Record<string, string>
    // 只有編輯頁有：載入那一列的期間
    loading?: boolean
    loadError?: string | null
    // 送出失敗的訊息。不經過 PageState，表單留在畫面上
    error?: string | null
  }>(), { lockId: undefined })

  // 新增頁不會是 null。編輯頁在載入中與找不到資料時為 null
  const model = defineModel<object | null>({ required: true })

  // 已有 id 即為修改既有的列（編輯頁），主鍵唯讀。新增頁的 id 於送出時才決定
  const lockId = computed(() => props.lockId ?? Boolean((model.value as { id?: string } | null)?.id))
</script>

<template>
  <div>
    <PageState :empty="!model" :error="loadError" :loading="loading">
      <!-- PageState 已擋下 null，此層只用於縮小型別 -->
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

        <!-- 這張表額外放置的內容，例如說明、預覽。一般不使用 -->
        <slot :row="model" />
      </template>
    </PageState>
  </div>
</template>
