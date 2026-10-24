import { shallowRef } from 'vue'

// 同網域的其他 App 共用 localStorage，key 加上 BASE_URL 以免互相覆蓋
const KEY = `${import.meta.env.BASE_URL}:token`

// 無痕模式或封鎖網站資料時 localStorage 拋出錯誤，一律視為未儲存
function read (): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// localStorage 不是響應式的，畫面與 guard 皆讀取此 ref
export const token = shallowRef<string | null>(read())

export function setToken (value: string): void {
  token.value = value
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // 無法儲存時，token 只在此次開啟期間有效
  }
}

export function clearToken (): void {
  token.value = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 無法移除時忽略
  }
}
