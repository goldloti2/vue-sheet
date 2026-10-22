<script lang="ts" setup>
  import type { DisplayValue } from '@/schema/format'
  import type { FormatColor } from '@/schema/types'
  import { computed } from 'vue'

  // 顯示一欄的值與它的條件式格式（schema/format.ts 的 displayValue）：圖示依序在前，文字套上顏色與字形。
  // 值為空時不畫任何東西，所在元素維持 :empty
  const { value } = defineProps<{
    value: DisplayValue
  }>()

  function colorClass (color: FormatColor | undefined): string | undefined {
    return color ? `formatted-value--${color}` : undefined
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

/* 常用色名，取自 Material Design 色板：淺色主題用較深的色值，深色主題用較淺的，皆以 APCA 檢查達 Lc 60。
   黃色例外：深色主題為 yellow A700，淺色主題為同一色相（OKLCH）降低亮度至達標的值，不在色板上 */
.formatted-value--red { color: #c62828; }
.formatted-value--orange { color: #e65100; }
.formatted-value--yellow { color: #a58a08; }
.formatted-value--green { color: #2e7d32; }
.formatted-value--blue { color: #1565c0; }
.formatted-value--purple { color: #6a1b9a; }
.formatted-value--grey { color: #616161; }

/* 整個選擇器須包在 :global() 內：:global(.a) .b 會被編譯成只剩 .a */
:global(.v-theme--dark .formatted-value--red) { color: #ef9a9a; }
:global(.v-theme--dark .formatted-value--orange) { color: #ffa726; }
:global(.v-theme--dark .formatted-value--yellow) { color: #ffd600; }
:global(.v-theme--dark .formatted-value--green) { color: #81c784; }
:global(.v-theme--dark .formatted-value--blue) { color: #90caf9; }
:global(.v-theme--dark .formatted-value--purple) { color: #e1bee7; }
:global(.v-theme--dark .formatted-value--grey) { color: #bdbdbd; }
</style>
