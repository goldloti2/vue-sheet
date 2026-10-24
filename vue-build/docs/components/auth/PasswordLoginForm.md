# PasswordLoginForm

帳號與密碼兩個輸入欄加上一顆登入鈕，供 `authMethod: 'custom'` 使用。對應的後端為帳號密碼示範模組，見 [docs/auth.md](../../../../docs/auth.md)。此元件只有表單本身。

此元件搭配 `useLogin`（`composables/auth/`）使用：`submit` 直接接 `useLogin` 的 `login`，`loading` 接 `submitting`。

## Usage

```vue
<script lang="ts" setup>
  import PasswordLoginForm from '@/components/ui/auth/PasswordLoginForm.vue'
  import { useLogin } from '@/composables/auth/useLogin'

  definePage({ meta: { title: '登入', public: true, shell: false } })

  const { login, submitting, error } = useLogin()
</script>

<template>
  <PasswordLoginForm :loading="submitting" @submit="login" />
  <v-alert v-if="error" :text="error" type="error" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `loading` | `boolean?` | 登入鈕顯示轉圈，接 `useLogin` 的 `submitting` |

## Emits

| event | payload | 說明 |
| --- | --- | --- |
| `submit` | `{ username, password }` | 兩欄都填寫時才發出。直接接 `useLogin` 的 `login` |

## 備註

- 兩欄分別設有 `autocomplete="username"` 與 `autocomplete="current-password"`，外層為真正的 `<form>`
- 離開登入頁時（`onDeactivated`），元件清除密碼欄
- 登入頁的 `meta` 須同時標示兩項：
  - `public: true`：沒有 token 也能進入
  - `shell: false`：`AppShell` 不顯示 App Bar、側邊欄與底部導覽列
