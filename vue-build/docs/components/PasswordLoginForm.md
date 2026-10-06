# PasswordLoginForm

帳號與密碼兩欄加一顆登入鈕，給 `authMethod: 'custom'` 用（對應後端的帳號密碼示範模組，見 [docs/auth.md](../../../docs/auth.md)）。只有表單本身。

搭 `useLogin` 用（`composables/auth/`）：`submit` 直接接它的 `login`，`loading` 接 `submitting`。

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
| `loading` | `boolean?` | 登入鈕顯示轉圈（`useLogin` 的 `submitting`） |

## Emits

| event | payload | 說明 |
| --- | --- | --- |
| `submit` | `{ username, password }` | 兩欄都有填才會發；直接接 `useLogin` 的 `login` |

## 備註

- 兩欄有 `autocomplete="username"`／`autocomplete="current-password"`，外面是真的 `<form>`，瀏覽器的密碼管理員才會記住並自動填入
- 離開登入頁時（`onDeactivated`）會清掉密碼欄。登入頁會被 KeepAlive 留著，不清的話密碼會一直待在記憶體裡
- 登入頁的 `meta` 兩個都要標：`public: true` 讓沒有 token 也能進來（否則登入頁本身會被導向登入頁），`shell: false` 讓 `AppShell` 不顯示 App Bar、側邊欄與底部導覽列
