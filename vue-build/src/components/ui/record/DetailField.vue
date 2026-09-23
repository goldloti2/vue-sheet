<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  interface DetailFieldProps {
    label: string
    value: string
    // 這一欄的動作：右邊出現圖示，整格都能點（見 docs/ui.md）
    action?: PageAction
  }

  defineProps<DetailFieldProps>()

  const runAction = useRunAction()
</script>

<template>
  <div class="detail-field">
    <span class="detail-field__label text-body-medium text-medium-emphasis">{{ label }}</span>

    <button
      v-if="action"
      :aria-label="action.label"
      class="detail-field__value detail-field__action text-body-large"
      type="button"
      @click="runAction(action)"
    >
      <span>{{ value }}</span>
      <v-icon :icon="action.icon" size="18" />
    </button>

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

.detail-field__action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
</style>
