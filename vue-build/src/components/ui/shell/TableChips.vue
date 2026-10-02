<script lang="ts" setup>
  import type { ListTable } from '@/composables/shell/useListControls'

  defineProps<{
    tables: ListTable[]
  }>()

  // 選中那張表的 tableLabel
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
      :key="item.schema.tableLabel"
      size="small"
      :text="item.schema.tableLabel"
      :value="item.schema.tableLabel"
    />
  </v-chip-group>
</template>
