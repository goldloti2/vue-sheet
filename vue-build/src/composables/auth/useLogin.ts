import type { LoginCredentials } from '@/services/appScript'
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchToken } from '@/services/appScript'
import { setToken } from '@/services/auth/token'
import { useTablesStore } from '@/stores/tables'

// 登入頁的資料層：送出、錯誤訊息、登入後回到原本要去的那頁
export function useLogin () {
  const route = useRoute()
  const router = useRouter()
  const store = useTablesStore()

  const submitting = shallowRef(false)
  const error = shallowRef<string | null>(null)

  // 只收站內路徑，網址上的 redirect 是任何人都能改的
  function redirectTarget (): string {
    const { redirect } = route.query
    return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
  }

  async function login (credentials: LoginCredentials): Promise<void> {
    submitting.value = true
    error.value = null
    try {
      setToken(await fetchToken(credentials))
      // 頁面被 KeepAlive 留著，不會自己再載一次；token 失效時載入失敗的表在這裡重抓。
      void store.reload()
      await router.replace(redirectTarget())
    } catch (loginError) {
      error.value = loginError instanceof Error ? loginError.message : String(loginError)
    } finally {
      submitting.value = false
    }
  }

  return { login, submitting, error }
}
