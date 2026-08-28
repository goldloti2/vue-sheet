/**
 * router/index.ts
 *
 * Automatic routes for ./src/pages/*.vue
 */

// Composables
import { shallowRef } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 這次瀏覽在 App 裡面總共導覽過幾次；第一次載入（不管是首頁還是直接貼網址）算 1。
// 用來判斷「返回」要不要相信瀏覽器歷史紀錄——count > 1 才代表真的有上一頁在 App 裡
export const navigationCount = shallowRef(0)

// 頁面切換動畫方向：路徑變深（例如列表→詳細）算前進，變淺（詳細→列表）算後退。對應的 CSS 寫在 App.vue
export const transitionDir = shallowRef<'page-forward' | 'page-back'>('page-forward')

function pathDepth (path: string): number {
  return path.split('/').filter(Boolean).length
}

router.beforeEach((to, from) => {
  transitionDir.value = pathDepth(to.path) < pathDepth(from.path) ? 'page-back' : 'page-forward'
})

router.afterEach(() => {
  navigationCount.value++
})

export default router
