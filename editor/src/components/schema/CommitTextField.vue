<script lang="ts" setup>
  import { shallowRef, watch } from 'vue'

  const props = defineProps<{
    modelValue: string
    disabled?: boolean
    type?: 'text' | 'number'
    placeholder?: string
    /** 送出時呼叫，取代 commit 事件。回傳 false 時，輸入框改回原值 */
    commit?: (value: string) => Promise<boolean>
  }>()

  const emit = defineEmits<{
    commit: [value: string]
  }>()

  // 輸入中的文字。焦點離開或按 Enter 時，與原值不同才送出
  const draft = shallowRef(props.modelValue)
  watch(() => props.modelValue, value => {
    draft.value = value
  })

  // 處理中的值。Enter 之後的焦點離開不再送出同一個值
  let pending: string | null = null

  async function submit (): Promise<void> {
    const value = draft.value
    if (value === props.modelValue || value === pending) {
      return
    }
    if (!props.commit) {
      emit('commit', value)
      return
    }
    pending = value
    const done = await props.commit(value)
    pending = null
    if (!done) {
      draft.value = props.modelValue
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
    @blur="submit"
    @keydown.enter="submit"
  />
</template>
