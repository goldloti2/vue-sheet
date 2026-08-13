<script lang="ts" setup>
  interface DetailFieldProps {
    label: string
    value: string
  }

  defineProps<DetailFieldProps>()
</script>

<template>
  <div class="detail-field">
    <span class="detail-field__label text-body-medium text-medium-emphasis">{{ label }}</span>
    <span class="detail-field__value text-body-large">{{ value }}</span>
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
</style>
