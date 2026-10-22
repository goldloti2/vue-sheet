<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { computed } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'

  // detail 頁的標頭：僅使用 image、title、subtitle、summary 與這一列的動作（defineView）
  const { row, view } = defineProps<{
    row: Row
    view: RowView<Row>
  }>()

  const fields = computed(() => view(row))

  const hasText = computed(() => Boolean(fields.value.title?.text || fields.value.subtitle?.text || fields.value.summary?.text))
  const hasActions = computed(() => fields.value.actions.slice(0, 4).some(action => action !== null))
</script>

<template>
  <div v-if="fields.image || hasText || hasActions" class="detail-header">
    <!-- 有圖片時寬度貼齊畫面兩側，文字疊於圖片下緣；沒有圖片時為透明背景，寬度與欄位區相同、高度僅為文字的高度 -->
    <div class="detail-header__top" :class="{ 'detail-header__top--image': fields.image }">
      <img v-if="fields.image" alt="" class="detail-header__image" :src="fields.image">

      <div v-if="hasText" class="detail-header__scrim">
        <v-container class="detail-header__text">
          <div v-if="fields.title?.text" class="text-headline-small font-weight-bold"><FormattedValue :value="fields.title" /></div>
          <div v-if="fields.subtitle?.text" class="detail-header__secondary text-body-large"><FormattedValue :value="fields.subtitle" /></div>
          <div v-if="fields.summary?.text" class="detail-header__summary text-body-large"><FormattedValue :value="fields.summary" /></div>
        </v-container>
      </div>
    </div>

    <!-- 動作接於圖片下方，不疊於圖上 -->
    <v-container v-if="hasActions" class="detail-header__actions">
      <ViewActions :actions="fields.actions" variant="slots" />
    </v-container>
  </div>
</template>

<style scoped>
.detail-header__top {
  position: relative;
}

/* 固定 16:9、裁切填滿；寬螢幕上以 40vh 為上限 */
.detail-header__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 40vh;
  object-fit: cover;
}

.detail-header__text {
  padding-bottom: 0;
}

/* 疊於圖片下緣的文字墊一層由透明至深色的漸層，圖片再亮也看得清楚 */
.detail-header__top--image .detail-header__scrim {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.detail-header__top--image .detail-header__text {
  padding-top: 32px;
  padding-bottom: 16px;
}

.detail-header__secondary {
  opacity: var(--v-medium-emphasis-opacity);
}

.detail-header__top--image .detail-header__secondary {
  opacity: 0.87;
}

/* 摘要與標題同色、與副標同大小；上方空一行，沒有副標時與標題亦隔開 */
.detail-header__summary {
  margin-top: 1lh;
}

.detail-header__actions {
  padding-top: 8px;
  padding-bottom: 0;
}
</style>
