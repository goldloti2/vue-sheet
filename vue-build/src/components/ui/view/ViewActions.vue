<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { computed } from 'vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  // view 的列上動作：依陣列順序由左往右排列、整組靠右，null 略過（見 docs/actions.md）
  const { actions } = defineProps<{
    actions: (PageAction | null)[]
  }>()

  const shown = computed(() => actions.filter(action => action !== null))

  const runAction = useRunAction()
</script>

<template>
  <div v-if="shown.length > 0" class="view-actions">
    <button
      v-for="action in shown"
      :key="action.key"
      :aria-label="action.display === 'text' ? undefined : action.label"
      class="view-actions__button"
      :class="{ 'view-actions__button--text': action.display === 'text' }"
      type="button"
      @click="runAction(action)"
    >
      <span v-if="action.display === 'text'" class="text-label-large">{{ action.label }}</span>
      <v-icon v-else :icon="action.icon" size="20" />
    </button>
  </div>
</template>

<style scoped>
.view-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

/* 使用原生 button 而非 v-btn：列數達上千時 v-btn 的實例成本過高（見 docs/components/ViewActions.md） */
.view-actions__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 16px;
}

.view-actions__button--text {
  padding: 0 8px;
  color: rgb(var(--v-theme-primary));
}
</style>
