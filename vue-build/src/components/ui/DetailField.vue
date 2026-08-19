<script lang="ts" setup>
  import { mdiChevronRightCircle } from '@mdi/js'
  import { RouterLink } from 'vue-router'

  interface DetailFieldProps {
    label: string
    value: string
    // 有傳的話 value 會變成連到該路徑的連結（例如關聯欄位連到對應表的 detail 頁）
    to?: string
  }

  defineProps<DetailFieldProps>()
</script>

<template>
  <div class="detail-field">
    <span class="detail-field__label text-body-medium text-medium-emphasis">{{ label }}</span>

    <RouterLink v-if="to" class="detail-field__value detail-field__link text-body-large" :to="to">
      <span>{{ value }}</span>
      <v-icon :icon="mdiChevronRightCircle" size="18" />
    </RouterLink>

    <span v-else class="detail-field__value text-body-large">{{ value }}</span>
  </div>
</template>

<style scoped>
.detail-field {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: 38fr 62fr;
  align-items: baseline;
  column-gap: 12px;
  width: 100%;
  padding: 12px 16px;
}

.detail-field__label {
  text-align: right;
}

.detail-field__value {
  text-align: left;
}

.detail-field__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: inherit;
  text-decoration: none;
}
</style>
