<script lang="ts" setup>
  import type { DisplayValue } from '@/schema/format'
  import type { ColorName } from '@/schema/types'
  import { computed } from 'vue'

  // 顯示一欄的值與其條件式格式：圖示依序在前，文字套上顏色與字形。值為空時不顯示，元素維持 :empty
  const { value } = defineProps<{
    value: DisplayValue
  }>()

  // 顏色為 Vuetify 主題的共用色名（plugins/vuetify.ts）
  function colorClass (color: ColorName | undefined): string | undefined {
    return color ? `text-vuesheet-${color}` : undefined
  }

  const textClass = computed(() => {
    const format = value.format
    return format
      ? [
        colorClass(format.color),
        {
          'font-weight-bold': format.bold,
          'font-italic': format.italic,
          'text-decoration-underline': format.underline && !format.strike,
          'text-decoration-line-through': format.strike && !format.underline,
          'formatted-value--underline-strike': format.underline && format.strike,
        },
      ]
      : undefined
  })
</script>

<template>
  <span v-if="value.text" class="formatted-value" :class="textClass">
    <v-icon
      v-for="(item, index) in value.format?.icons ?? []"
      :key="index"
      class="formatted-value__icon"
      :class="colorClass(item.color)"
      :icon="item.icon"
      size="1.1em"
    />{{ value.text }}
  </span>
</template>

<style scoped>
.formatted-value__icon {
  margin-inline-end: 2px;
  vertical-align: -0.15em;
}

.formatted-value--underline-strike {
  text-decoration-line: underline line-through;
}
</style>
