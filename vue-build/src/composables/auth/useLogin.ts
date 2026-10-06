import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setToken } from '@/services/auth/token'

// 登入表單送出的東西，內容由認證模組決定（帳號密碼、Google 的 ID token…）
export type LoginCredentials = Record<string, string>

// 登入頁的資料層：送出、錯誤訊息、登入後回到原本要去的那頁
export function useLogin () {
  const route = useRoute()
  const router = useRouter()

  const submitting = shallowRef(false)
  const error = shallowRef<string | null>(null)

  // 只收站內路徑，網址上的 redirect 是任何人都能改的
  function redirectTarget (): string {
    const { redirect } = route.query
    return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
  }

  async function login (_credentials: LoginCredentials): Promise<void> {
    submitting.value = true
    error.value = null
    try {
      // 🔲 placeholder：還沒接後端，先存一個固定值，只用來測導向
      setToken('placeholder')
      await router.replace(redirectTarget())
    } catch (loginError) {
      error.value = loginError instanceof Error ? loginError.message : String(loginError)
    } finally {
      submitting.value = false
    }
  }

  return { login, submitting, error }
}
