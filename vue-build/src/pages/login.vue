<script lang="ts" setup>
  import PasswordLoginForm from '@/components/ui/auth/PasswordLoginForm.vue'
  import { useLogin } from '@/composables/auth/useLogin'
  import { appName, authMethod } from '@/config/app'

  // public：沒有 token 也能進來；shell: false：不顯示 App Bar、側邊欄與底部導覽列
  definePage({ meta: { title: '登入', public: true, shell: false } })

  const { login, submitting, error } = useLogin()
</script>

<template>
  <div class="login-page">
    <v-card max-width="400" width="100%">
      <v-card-title class="text-h5 text-center py-6">{{ appName }}</v-card-title>

      <v-card-text>
        <PasswordLoginForm v-if="authMethod === 'custom'" :loading="submitting" @submit="login" />
        <!-- 'google'：Google 登入按鈕，尚未實作 -->

        <v-alert v-if="error" class="mt-4" :text="error" type="error" />
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 16px;
}
</style>
