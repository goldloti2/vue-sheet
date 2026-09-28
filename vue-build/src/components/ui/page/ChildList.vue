<script lang="ts" setup generic="Row extends { id: string }">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { computed } from 'vue'
  import CountLabel from '@/components/ui/list/CountLabel.vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  const props = withDefaults(defineProps<{
    title: string
    rows: readonly Row[]
    limit?: number
    to?: string
    actions?: PageAction[]
    emptyText?: string
  }>(), {
    limit: 5,
    emptyText: '還沒有資料',
  })

  defineSlots<{
    // 給的是截斷後的那幾列：要卡片就自己 v-for DataList，要表格就整批餵給 DataTable
    default?: (slotProps: { rows: Row[] }) => unknown
  }>()

  const shown = computed(() => props.limit > 0 ? props.rows.slice(0, props.limit) : [...props.rows])

  const runAction = useRunAction()
</script>

<template>
  <v-container>
    <div class="text-title-medium font-weight-bold mb-2">
      <CountLabel :count="rows.length" :label="title" />
    </div>

    <slot v-if="rows.length > 0" :rows="shown" />

    <div v-else class="text-medium-emphasis">{{ emptyText }}</div>

    <div v-if="to || actions?.length" class="d-flex ga-2 justify-end mt-2">
      <v-btn v-if="to" text="展開" :to="to" variant="text" />

      <v-btn
        v-for="action in actions"
        :key="action.key"
        :text="action.label"
        variant="text"
        @click="runAction(action)"
      />
    </div>
  </v-container>
</template>
