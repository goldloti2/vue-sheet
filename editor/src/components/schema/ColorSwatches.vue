<script lang="ts" setup>
  import { mdiCancel } from '@mdi/js'
  import { inject } from 'vue'
  import { useColorValue } from '@/composables/useColorValue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'

  defineProps<{
    /** 可選的色名 */
    names: readonly string[]
    /** 目前的色名。沒有設定時為 null */
    selected: string | null
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    select: [name: string | null]
  }>()

  const form = inject(SCHEMA_FORM_KEY)!
  const colorOf = useColorValue(() => form.types.value)
</script>

<template>
  <div class="color-swatches">
    <button
      aria-label="不設定"
      class="color-swatches__swatch color-swatches__swatch--none"
      :class="{ 'color-swatches__swatch--selected': selected === null }"
      :disabled="disabled"
      title="不設定"
      type="button"
      @click="emit('select', null)"
    >
      <v-icon :icon="mdiCancel" size="16" />
    </button>

    <button
      v-for="name in names"
      :key="name"
      :aria-label="name"
      class="color-swatches__swatch"
      :class="{ 'color-swatches__swatch--selected': selected === name }"
      :disabled="disabled"
      :style="{ background: colorOf(name) }"
      :title="name"
      type="button"
      @click="emit('select', name)"
    />
  </div>
</template>

<style scoped>
.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.color-swatches__swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
}

.color-swatches__swatch--none {
  border: thin solid rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.color-swatches__swatch--selected {
  outline-color: rgb(var(--v-theme-primary));
}
</style>
