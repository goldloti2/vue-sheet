<script lang="ts" setup>
  import type { SearchTable } from '@/composables/shell/useAppBarSearch'

  defineProps<{
    tables: SearchTable[]
  }>()

  // 選中那張表的 sheetName
  const picked = defineModel<string>({ required: true })
</script>

<template>
  <!-- 多張表才需要選；每張表的條件與排序是分開的，同時生效 -->
  <v-chip-group
    v-if="tables.length > 1"
    v-model="picked"
    class="px-3 pt-0"
    mandatory
    selected-class="text-primary"
  >
    <v-chip
      v-for="item in tables"
      :key="item.schema.sheetName"
      size="small"
      :text="item.schema.sheetName"
      :value="item.schema.sheetName"
    />
  </v-chip-group>
</template>
