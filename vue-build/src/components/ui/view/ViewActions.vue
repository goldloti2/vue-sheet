<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiDotsVertical } from '@mdi/js'
  import { computed, ref, useTemplateRef } from 'vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'
  import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'

  // view 的列上動作，row 為一排按鈕、menu 為 ⋮ 選單、slots 為左右各兩格（見 docs/components/view/ViewActions.md）
  const { actions, variant = 'row' } = defineProps<{
    actions: (PageAction | null)[]
    variant?: 'row' | 'menu' | 'slots'
  }>()

  const shown = computed(() => actions.filter(action => action !== null))

  // slots 只取前四格
  const items = computed(() => variant === 'slots' ? actions.slice(0, 4) : shown.value)
  const visible = computed(() => items.value.some(action => action !== null))

  // dashboard 中，文字按鈕另繪圖示，窄面板時改為顯示圖示。一般頁面不建立這個 v-icon
  const inDashboard = useDashboardSelection() !== null

  const runAction = useRunAction()

  // 選單於第一次按下時才掛上，之後的開關交由 v-menu 綁定於按鈕的事件處理
  const menuButton = useTemplateRef('menuButton')
  const menuMounted = ref(false)
  const menuOpen = ref(false)

  function mountMenu () {
    if (!menuMounted.value) {
      menuMounted.value = true
      menuOpen.value = true
    }
  }
</script>

<template>
  <div v-if="visible" class="view-actions" :class="{ 'view-actions--slots': variant === 'slots' }">
    <template v-if="variant === 'menu'">
      <button
        ref="menuButton"
        aria-label="更多動作"
        class="view-actions__button"
        type="button"
        @click="mountMenu"
      >
        <v-icon :icon="mdiDotsVertical" size="20" />
      </button>

      <v-menu v-if="menuMounted" v-model="menuOpen" :activator="menuButton ?? undefined">
        <v-list class="action-menu" density="compact">
          <v-list-item
            v-for="action in shown"
            :key="action.key"
            :prepend-icon="action.icon"
            :title="action.label"
            @click="runAction(action)"
          />
        </v-list>
      </v-menu>
    </template>

    <!-- slots 的第 3 格起靠右，空格以等寬的空白保留位置 -->
    <template v-for="(action, index) in items" v-else :key="action?.key ?? `empty-${index}`">
      <button
        v-if="action"
        :aria-label="action.display === 'text' && !inDashboard ? undefined : action.label"
        class="view-actions__button"
        :class="{
          'view-actions__button--text': action.display === 'text',
          'view-actions__right': variant === 'slots' && index === 2,
        }"
        type="button"
        @click="runAction(action)"
      >
        <template v-if="action.display === 'text'">
          <span class="view-actions__label text-label-large">{{ action.label }}</span>
          <v-icon v-if="inDashboard" class="view-actions__text-icon" :icon="action.icon" size="20" />
        </template>

        <v-icon v-else :icon="action.icon" size="20" />
      </button>

      <span v-else class="view-actions__empty" :class="{ 'view-actions__right': index === 2 }" />
    </template>
  </div>
</template>

<style scoped>
/* 放不下時換行（dashboard 的窄面板） */
.view-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.view-actions--slots {
  justify-content: flex-start;
}

.view-actions__right {
  margin-left: auto;
}

.view-actions__empty {
  width: 32px;
  height: 32px;
}

/* 使用原生 button，不使用 v-btn（見 docs/components/view/ViewActions.md） */
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

/* 行高的上下留白因字型而不對稱，中文字偏上。裁至大寫字母頂端與基線之間再置中 */
.view-actions__label {
  text-box: trim-both cap alphabetic;
}

.view-actions__text-icon {
  display: none;
}

/* dashboard 中 3 格以下的窄面板：文字按鈕改為圖示，整行靠左，slots 不分左右、不留空格 */
@container dashboard-panel (width < 200px) {
  .view-actions {
    justify-content: flex-start;
  }

  .view-actions__right {
    margin-left: 0;
  }

  .view-actions__empty {
    display: none;
  }

  .view-actions__button--text {
    padding: 0;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  }

  .view-actions__button--text .view-actions__label {
    display: none;
  }

  .view-actions__button--text .view-actions__text-icon {
    display: inline-flex;
  }
}
</style>
