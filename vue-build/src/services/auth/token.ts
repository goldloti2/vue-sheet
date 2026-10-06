import { shallowRef } from 'vue'

// 同網域的其他 App 共用同一份 localStorage，key 帶上 BASE_URL 才不會互相蓋掉
const KEY = `${import.meta.env.BASE_URL}:token`

// 無痕模式或封鎖網站資料時 localStorage 會丟錯，一律當作沒存
function read (): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// localStorage 不是響應式的，畫面與 guard 都讀這一份
export const token = shallowRef<string | null>(read())

export function setToken (value: string): void {
  token.value = value
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // 存不進去就只在這次開啟有效
  }
}

export function clearToken (): void {
  token.value = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 同上
  }
}
