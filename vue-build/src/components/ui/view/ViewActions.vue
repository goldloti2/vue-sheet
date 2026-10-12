<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiDotsVertical } from '@mdi/js'
  import { computed, ref, useTemplateRef } from 'vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  // view 的列上動作：row 依陣列順序由左往右排列、整組靠右；menu 收於 ⋮ 選單。null 略過（見 docs/actions.md）
  const { actions, variant = 'row' } = defineProps<{
    actions: (PageAction | null)[]
    variant?: 'row' | 'menu'
  }>()

  const shown = computed(() => actions.filter(action => action !== null))

  const runAction = useRunAction()

  // 選單於第一次按下時才掛上，之後的開關交由 v-menu 綁在按鈕上的事件處理
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
  <div v-if="shown.length > 0" class="view-actions">
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
        <v-list density="compact">
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

    <template v-else>
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
    </template>
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
