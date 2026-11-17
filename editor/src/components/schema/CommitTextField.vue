<script lang="ts" setup>
  import { shallowRef, watch } from 'vue'

  const props = defineProps<{
    modelValue: string
    disabled?: boolean
    type?: 'text' | 'number'
    placeholder?: string
  }>()

  const emit = defineEmits<{
    commit: [value: string]
  }>()

  // 輸入中的文字。焦點離開或按 Enter 時，與原值不同才送出
  const draft = shallowRef(props.modelValue)
  watch(() => props.modelValue, value => {
    draft.value = value
  })

  function commit (): void {
    if (draft.value !== props.modelValue) {
      emit('commit', draft.value)
    }
  }
</script>

<template>
  <v-text-field
    v-model="draft"
    autocomplete="off"
    density="compact"
    :disabled="disabled"
    hide-details
    :placeholder="placeholder"
    single-line
    :type="type ?? 'text'"
    variant="outlined"
    @blur="commit"
    @keydown.enter="commit"
  />
</template>
