<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  interface DetailFieldProps {
    label: string
    value: string
    // image 欄位轉好的 <img src>；有值就顯示圖片而不是文字
    image?: string | null
    // 這一欄的動作：右邊出現圖示，整格都能點（見 docs/actions.md）
    action?: PageAction | null
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

    <img v-else-if="image" alt="" class="detail-field__image" :src="image">

    <span v-else class="detail-field__value text-body-large">{{ value }}</span>
  </div>
</template>

<style scoped>
/* 兩欄以 minmax(0, …) 固定比例，不被內容撐開；沒有空白的長字串（網址、編號）於任意處換行 */
.detail-field {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 38fr) minmax(0, 62fr);
  align-items: baseline;
  column-gap: 12px;
  width: 100%;
  padding: 12px 16px;
  overflow-wrap: anywhere;
}

.detail-field__label {
  text-align: right;
}

.detail-field__value {
  text-align: left;
}

.detail-field__image {
  justify-self: start;
  max-width: 100%;
  max-height: 160px;
  border-radius: 4px;
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

.detail-field__action > span {
  min-width: 0;
}

/* dashboard 中 3 格以下的窄面板：名稱與值改為上下兩行，名稱靠左（門檻見 docs/components/panel/DashboardPanel.md） */
@container dashboard-panel (width < 200px) {
  .detail-field {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 2px;
  }

  .detail-field__label {
    text-align: left;
  }
}
</style>
