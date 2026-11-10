<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { DetailFieldLayout } from '@/config/app'
  import type { DisplayValue } from '@/schema/format'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'
  import { detailFieldLayout } from '@/config/app'

  interface DetailFieldProps {
    label: string
    // 顯示的文字與條件式格式（schema/format.ts 的 displayValue）
    value: DisplayValue
    // image 欄位已轉換的 <img src>。有值時顯示圖片，不顯示文字
    image?: string | null
    // 這一欄的動作：右側出現圖示，整格可點擊（見 docs/topics/actions.md）
    action?: PageAction | null
    // 名稱與值左右並排或上下兩行。省略時依 config/app.ts 的 detailFieldLayout
    layout?: DetailFieldLayout
    // 長文：保留值中的換行
    multiline?: boolean
  }

  withDefaults(defineProps<DetailFieldProps>(), {
    layout: detailFieldLayout,
  })

  // value：以輸入元件取代顯示的值（快速編輯）。有動作時，動作的圖示接在其右側
  const slots = defineSlots<{ value?: () => unknown }>()

  const runAction = useRunAction()
</script>

<template>
  <div class="detail-field" :class="{ 'detail-field--stacked': layout === 'stacked' }">
    <span class="detail-field__label text-body-medium text-medium-emphasis">{{ label }}</span>

    <div v-if="slots.value" class="detail-field__value detail-field__editor">
      <slot name="value" />

      <v-btn
        v-if="action"
        :aria-label="action.label"
        density="comfortable"
        :icon="action.icon"
        size="small"
        variant="text"
        @click="runAction(action)"
      />
    </div>

    <button
      v-else-if="action"
      :aria-label="action.label"
      class="detail-field__value detail-field__action text-body-large"
      :class="{ 'detail-field__value--multiline': multiline }"
      type="button"
      @click="runAction(action)"
    >
      <span><FormattedValue :value="value" /></span>
      <v-icon :icon="action.icon" size="18" />
    </button>

    <img v-else-if="image" alt="" class="detail-field__image" :src="image">

    <span
      v-else
      class="detail-field__value text-body-large"
      :class="{ 'detail-field__value--multiline': multiline }"
    ><FormattedValue :value="value" /></span>
  </div>
</template>

<style scoped>
/* 兩欄以 minmax(0, …) 固定比例，不隨內容變寬。沒有空白的長字串可於任意處換行。上下的留白見 docs/design/detail.md */
.detail-field {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 38fr) minmax(0, 62fr);
  align-items: baseline;
  column-gap: 12px;
  width: 100%;
  padding: 8px 16px;
  overflow-wrap: anywhere;
}

.detail-field__label {
  text-align: right;
}

.detail-field__value {
  text-align: left;
}

.detail-field__value--multiline {
  white-space: pre-line;
}

/* 快速編輯：輸入元件佔滿值的那一欄，與名稱垂直置中 */
.detail-field:has(.detail-field__editor) {
  align-items: center;
}

.detail-field__editor {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.detail-field__editor > :first-child {
  flex: 1 1 auto;
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

/* 上下兩行：名稱在上、值在下，皆靠左 */
.detail-field--stacked {
  grid-template-columns: minmax(0, 1fr);
  row-gap: 2px;
}

.detail-field--stacked .detail-field__label {
  text-align: left;
}

/* dashboard 的窄面板：不論設定，一律上下兩行（門檻見 docs/design/dashboard.md） */
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
