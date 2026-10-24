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
    actions?: (PageAction | null)[]
    emptyText?: string
  }>(), {
    limit: 5,
    emptyText: '還沒有資料',
  })

  defineSlots<{
    // 提供截斷後的子列：卡片由頁面自行 v-for，表格則整批交給 DataTable
    default?: (slotProps: { rows: Row[] }) => unknown
  }>()

  const shown = computed(() => props.limit > 0 ? props.rows.slice(0, props.limit) : [...props.rows])

  const shownActions = computed(() => (props.actions ?? []).filter(action => action !== null))

  const runAction = useRunAction()
</script>

<template>
  <v-container>
    <div class="text-title-medium font-weight-bold mb-2">
      <CountLabel :count="rows.length" :label="title" />
    </div>

    <slot v-if="rows.length > 0" :rows="shown" />

    <div v-else class="text-medium-emphasis">{{ emptyText }}</div>

    <div v-if="to || shownActions.length > 0" class="d-flex flex-wrap ga-2 justify-end mt-2">
      <v-btn v-if="to" text="展開" :to="to" variant="text" />

      <v-btn
        v-for="action in shownActions"
        :key="action.key"
        :text="action.label"
        variant="text"
        @click="runAction(action)"
      />
    </div>
  </v-container>
</template>
