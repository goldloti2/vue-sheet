<script generic="Row extends object" lang="ts" setup>
  import type { RowView } from '@/schema/view'
  import { computed } from 'vue'
  import ViewActions from '@/components/ui/view/ViewActions.vue'
  import { useRowLink } from '@/composables/navigation/useRowLink'

  // 泛型元件的 props 型別須寫於 defineProps 內，抽成 interface 會使型別宣告輸出失敗
  const { row, view, to } = defineProps<{
    row: Row
    // 僅使用 title、subtitle、image 三個位置與這一列的動作（defineView）
    view: RowView<Row>
    to?: string
  }>()

  const fields = computed(() => view(row))

  const { href, navigate } = useRowLink(() => to)
</script>

<template>
  <div class="profile-item">
    <!-- 有 to 時為 <a>，否則為純顯示的一張卡片。::after 覆蓋整張卡片，⋮ 以外的區域皆屬於連結 -->
    <component :is="to ? 'a' : 'div'" class="profile-item__link" :href="href" @click="navigate">
      <img v-if="fields.image" alt="" class="profile-item__avatar" :src="fields.image">

      <div class="profile-item__text">
        <div class="profile-item__title text-title-medium font-weight-bold">{{ fields.title }}</div>
        <div class="profile-item__subtitle text-body-medium text-medium-emphasis">{{ fields.subtitle }}</div>
      </div>
    </component>

    <ViewActions :actions="fields.actions" class="profile-item__actions" variant="menu" />
  </div>
</template>

<style scoped>
.profile-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 8px 12px 16px;
  margin-bottom: 8px;
  /* 畫面外的卡片不排版也不繪製；68px 為尚未量得實際高度前的替代值 */
  content-visibility: auto;
  contain-intrinsic-size: auto 68px;
  background: rgb(var(--v-theme-surface));
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.16);
}

.profile-item__link {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.profile-item__link::after {
  content: '';
  position: absolute;
  inset: 0;
}

.profile-item__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.profile-item__text {
  min-width: 0;
}

.profile-item__title,
.profile-item__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 須疊於連結的 ::after 之上才能點擊 */
.profile-item__actions {
  position: relative;
  z-index: 1;
}
</style>
