<script lang="ts" setup>
  // 設定項不是以字面值寫成時顯示的文字：以程式碼寫成，或檔案中找不到
  defineProps<{
    /** 以程式碼寫成時為原文，找不到時為 null */
    value: { kind: 'code', text: string } | null
    file: string
    name: string
  }>()
</script>

<template>
  <span v-if="value" class="text-medium-emphasis">以程式碼寫成：{{ value.text }}</span>
  <span v-else class="text-medium-emphasis">{{ file }} 中沒有 {{ name }}，請以其他編輯器修改</span>
</template>
