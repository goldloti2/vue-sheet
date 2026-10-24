import type { LoginCredentials } from '@/services/appScript'
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchToken } from '@/services/appScript'
import { setToken } from '@/services/auth/token'
import { useTablesStore } from '@/stores/tables'

// 登入頁的資料層：送出、錯誤訊息，以及登入後回到原本的目的地
export function useLogin () {
  const route = useRoute()
  const router = useRouter()
  const store = useTablesStore()

  const submitting = shallowRef(false)
  const error = shallowRef<string | null>(null)

  // 只接受站內路徑。網址上的 redirect 可被任何人修改
  function redirectTarget (): string {
    const { redirect } = route.query
    return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
  }

  async function login (credentials: LoginCredentials): Promise<void> {
    submitting.value = true
    error.value = null
    try {
      setToken(await fetchToken(credentials))
      // KeepAlive 保留的頁面不會重新載入，因此於此重新抓取 token 失效時載入失敗的表
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
