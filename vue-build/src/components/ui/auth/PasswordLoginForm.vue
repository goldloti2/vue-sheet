<script lang="ts" setup>
  import { computed, onDeactivated, shallowRef } from 'vue'

  defineProps<{
    loading?: boolean
  }>()

  const emit = defineEmits<{
    submit: [credentials: { username: string, password: string }]
  }>()

  const username = shallowRef('')
  const password = shallowRef('')

  const canSubmit = computed(() => username.value !== '' && password.value !== '')

  function submit () {
    if (canSubmit.value) {
      emit('submit', { username: username.value, password: password.value })
    }
  }

  // 登入頁會被 KeepAlive 留著，離開就把密碼清掉，不留在記憶體裡
  onDeactivated(() => {
    password.value = ''
  })
</script>

<template>
  <v-form @submit.prevent="submit">
    <v-text-field
      v-model="username"
      autocomplete="username"
      label="帳號"
      name="username"
    />

    <v-text-field
      v-model="password"
      autocomplete="current-password"
      label="密碼"
      name="password"
      type="password"
    />

    <v-btn
      block
      color="primary"
      :disabled="!canSubmit"
      :loading="loading"
      size="large"
      type="submit"
    >
      登入
    </v-btn>
  </v-form>
</template>
