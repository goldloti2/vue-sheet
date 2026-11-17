import { shallowRef } from 'vue'
import { fetchIcons } from '@/api'

type IconPaths = Record<string, string>

// 全部的 mdi 圖示，第一次使用時才向服務取得
let request: Promise<IconPaths> | null = null

/** 圖示的變數名（例如 mdiStar）對應 SVG 的 path。取得前為 null */
export function useMdiIcons () {
  const icons = shallowRef<IconPaths | null>(null)
  request ??= fetchIcons().catch(error => {
    request = null
    throw error
  })
  request.then(loaded => {
    icons.value = loaded
  }).catch(() => undefined)
  return icons
}
