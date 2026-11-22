<script lang="ts" setup>
  import type { MoveOption, NavItemInput, NavItemModel } from '../../../shared/navigationForm'
  import { mdiAlertOutline, mdiCircleSmall, mdiClose, mdiDragVertical, mdiFolderMoveOutline } from '@mdi/js'
  import { computed, shallowRef, watch } from 'vue'
  import CommitTextField from '../schema/CommitTextField.vue'
  import IconField from '../schema/IconField.vue'

  const props = defineProps<{
    item: NavItemModel
    routes: readonly string[]
    moveOptions: readonly MoveOption[]
    /** 超過底部導覽列的上限，不顯示於 App */
    hidden?: boolean
    /** 位於有標題的組中 */
    grouped?: boolean
  }>()

  const emit = defineEmits<{
    set: [name: keyof NavItemInput, value: string]
    move: [option: number]
    remove: []
  }>()

  const valueOf = (value: NavItemModel['title']) => value?.kind === 'value' ? value.value : null

  // 連結的輸入中的文字。選單選取或焦點離開時送出
  const to = shallowRef(valueOf(props.item.to) ?? '')
  watch(() => valueOf(props.item.to), value => {
    to.value = value ?? ''
  })
  const missing = computed(() => props.item.to?.kind === 'value' && !props.routes.includes(props.item.to.value))

  function commitTo (): void {
    const value = to.value.trim()
    if (value === '' || value === valueOf(props.item.to)) {
      to.value = valueOf(props.item.to) ?? ''
      return
    }
    emit('set', 'to', value)
  }

  function selectTo (value: string | null): void {
    to.value = value ?? ''
    if (value !== null && props.routes.includes(value)) {
      commitTo()
    }
  }

  // 不可空白
  async function commitTitle (text: string): Promise<boolean> {
    const value = text.trim()
    if (value === '') {
      return false
    }
    emit('set', 'title', value)
    return true
  }

  function selectIcon (name: string | null): void {
    if (name !== null) {
      emit('set', 'icon', name)
    }
  }
</script>

<template>
  <div class="nav-item-row" :class="{ 'nav-item-row--hidden': hidden }">
    <v-icon class="nav-item-row__handle text-medium-emphasis" :icon="mdiDragVertical" size="18" />
    <v-icon v-if="grouped" class="text-medium-emphasis" :icon="mdiCircleSmall" size="18" />

    <div class="nav-item-row__icon">
      <IconField v-if="item.icon?.kind !== 'code'" :code="valueOf(item.icon)" @select="selectIcon" />
      <span v-else class="text-medium-emphasis">以程式碼寫成</span>
    </div>

    <CommitTextField
      v-if="item.title?.kind === 'value'"
      class="nav-item-row__title"
      :commit="commitTitle"
      :model-value="item.title.value"
    />

    <span v-else class="nav-item-row__title text-medium-emphasis">以程式碼寫成</span>

    <div v-if="item.to?.kind !== 'code'" class="nav-item-row__to">
      <v-combobox
        class="nav-item-row__route"
        density="compact"
        hide-details
        :items="routes"
        :model-value="to"
        variant="outlined"
        @blur="commitTo"
        @keydown.enter="commitTo"
        @update:model-value="selectTo"
        @update:search="value => to = value ?? ''"
      />

      <span v-if="missing" class="nav-item-row__warning">
        <v-icon :icon="mdiAlertOutline" size="16" />
        找不到頁面
      </span>
    </div>

    <span v-else class="nav-item-row__route text-medium-emphasis">以程式碼寫成</span>

    <v-spacer />

    <v-menu location="bottom end">
      <template #activator="{ props: activator }">
        <v-btn
          v-bind="activator"
          aria-label="移至"
          :icon="mdiFolderMoveOutline"
          size="small"
          variant="text"
        />
      </template>

      <v-list density="compact">
        <v-list-item
          v-for="(option, index) in moveOptions"
          :key="option.title"
          :disabled="option.disabled"
          :title="option.title"
          @click="emit('move', index)"
        />
      </v-list>
    </v-menu>

    <v-btn
      aria-label="刪除"
      :icon="mdiClose"
      size="small"
      variant="text"
      @click="emit('remove')"
    />
  </div>
</template>

<style scoped>
.nav-item-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  padding-inline: 8px;
}

.nav-item-row--hidden {
  opacity: var(--v-medium-emphasis-opacity);
}

.nav-item-row__handle {
  cursor: grab;
}

.nav-item-row__icon,
.nav-item-row__title {
  flex: none;
  width: 180px;
}

.nav-item-row__to {
  display: flex;
  flex: none;
  gap: 8px;
  align-items: center;
}

.nav-item-row__route {
  flex: none;
  width: 200px;
}

.nav-item-row__warning {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: rgb(var(--v-theme-warning));
}
</style>
