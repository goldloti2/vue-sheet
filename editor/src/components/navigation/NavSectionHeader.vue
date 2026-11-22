<script lang="ts" setup>
  import type { ConfigValue } from '../../../shared/configGs'
  import { mdiArrowDown, mdiArrowUp, mdiClose } from '@mdi/js'
  import CommitTextField from '../schema/CommitTextField.vue'
  import IconField from '../schema/IconField.vue'

  defineProps<{
    title: ConfigValue<string>
    icon: ConfigValue<string>
    first: boolean
    last: boolean
  }>()

  const emit = defineEmits<{
    /** null 為刪除此屬性。標題刪除後，此組成為不分組的項目 */
    set: [name: 'title' | 'icon', value: string | null]
    up: []
    down: []
    remove: []
  }>()

  async function commitTitle (text: string): Promise<boolean> {
    const value = text.trim()
    emit('set', 'title', value === '' ? null : value)
    return true
  }
</script>

<template>
  <div class="nav-section-header">
    <div class="nav-section-header__icon">
      <IconField v-if="icon?.kind !== 'code'" :code="icon?.kind === 'value' ? icon.value : null" @select="name => emit('set', 'icon', name)" />
      <span v-else class="text-medium-emphasis">以程式碼寫成</span>
    </div>

    <CommitTextField
      v-if="title?.kind === 'value'"
      class="nav-section-header__title"
      :commit="commitTitle"
      :model-value="title.value"
      placeholder="清空即為不分組"
    />

    <span v-else class="nav-section-header__title text-medium-emphasis">以程式碼寫成</span>

    <v-spacer />

    <v-btn
      aria-label="上移"
      :disabled="first"
      :icon="mdiArrowUp"
      size="small"
      variant="text"
      @click="emit('up')"
    />

    <v-btn
      aria-label="下移"
      :disabled="last"
      :icon="mdiArrowDown"
      size="small"
      variant="text"
      @click="emit('down')"
    />

    <v-btn
      aria-label="刪除組"
      :icon="mdiClose"
      size="small"
      variant="text"
      @click="emit('remove')"
    />
  </div>
</template>

<style scoped>
.nav-section-header {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding-inline: 8px;
}

.nav-section-header__icon {
  flex: none;
  width: 180px;
}

.nav-section-header__title {
  flex: none;
  width: 200px;
}
</style>
