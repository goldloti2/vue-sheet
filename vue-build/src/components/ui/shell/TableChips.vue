<script lang="ts" setup>
  import type { ListTable } from '@/composables/shell/useListControls'

  defineProps<{
    tables: ListTable[]
  }>()

  // 選取的表的 tableLabel
  const picked = defineModel<string>({ required: true })
</script>

<template>
  <!-- 有多張表時才顯示。每張表的條件與排序各自獨立，同時生效 -->
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
