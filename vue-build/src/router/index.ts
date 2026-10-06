/**
 * router/index.ts
 *
 * Automatic routes for ./src/pages/*.vue
 */

// Composables
import type { HistoryState, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { shallowRef } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { siblingDirection } from '@/composables/navigation/useListOrder'
import { authMethod } from '@/config/app'
import { navItems } from '@/config/navigation'
import { token } from '@/services/auth/token'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    // 不用登入也能看（登入頁本身）
    public?: boolean
    // false：不顯示 App Bar、側邊欄與底部導覽列
    shell?: boolean
  }
}

export const loginPath = '/login'

// 每個網址最後停在哪裡。跟 KeepAlive 是同一件事的兩半：元件狀態歸 KeepAlive（也是以 fullPath 為 key），
// 視窗的捲動位置不是元件狀態，所以記在這裡。上限跟 KeepAlive 的 max 一樣，滿了先丟最舊的
const scrollPositions = new Map<string, number>()
const MAX_SCROLL_POSITIONS = 50

function rememberScroll (fullPath: string): void {
  // 先刪再加，順序才會反映「最近用過」
  scrollPositions.delete(fullPath)
  scrollPositions.set(fullPath, window.scrollY)

  const oldest = scrollPositions.keys().next().value
  if (scrollPositions.size > MAX_SCROLL_POSITIONS && oldest !== undefined) {
    scrollPositions.delete(oldest)
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 回到看過的頁面就回到原本的位置（返回鍵有瀏覽器自己記的，優先用），沒看過的一律從頂端開始
  scrollBehavior (to, _from, savedPosition) {
    return { top: savedPosition?.top ?? scrollPositions.get(to.fullPath) ?? 0 }
  },
})

// 離場前記下來。這時畫面還沒換，window.scrollY 仍然是離開中那一頁的
router.beforeEach((_to, from) => {
  rememberScroll(from.fullPath)
})

// 包含第一次開啟（直接貼網址、重新整理）：沒有 token 就先去登入頁，登入後回到原本要去的地方
router.beforeEach(to => {
  const toLogin = to.path === loginPath
  if (authMethod === 'none' || (toLogin && token.value)) {
    return toLogin ? '/' : true
  }
  if (token.value || to.meta.public) {
    return true
  }
  return { path: loginPath, query: { redirect: to.fullPath } }
})

// 這次瀏覽在 App 裡面總共導覽過幾次；第一次載入（不管是首頁還是直接貼網址）算 1。
// 用來判斷「返回」要不要相信瀏覽器歷史紀錄——count > 1 才代表真的有上一頁在 App 裡
export const navigationCount = shallowRef(0)

// 頁面切換動畫方向，`App.vue` 把它掛成轉場容器的 data-dir（CSS 也在那裡）。判定分四層，優先度由上往下：
//   1. 兩端都是導覽項目 → 依導覽列上的排列順序（右邊的算前進）
//   2. 只有目的地是導覽項目 → 一律後退（從內頁回到頂層就是往外）
//   3. 同一個路由換 id，而且兩筆都在列表發布的順序裡 → 依它們在列表中的先後
//   4. 其他 → 看瀏覽器歷史是往前還是往後（點連結/action 是前進，返回鍵是後退）
export const transitionDir = shallowRef<'forward' | 'back'>('forward')

function navIndexOf (path: string): number {
  return navItems.findIndex(item => item.to === path)
}

function routeId (route: RouteLocationNormalized): string | null {
  const { id } = route.params as Record<string, string | string[] | undefined>
  return typeof id === 'string' ? id : null
}

function sameRecordDirection (to: RouteLocationNormalized, from: RouteLocationNormalized) {
  const toId = routeId(to)
  const fromId = routeId(from)
  if (to.name !== from.name || !toId || !fromId || toId === fromId) {
    return null
  }
  return siblingDirection(fromId, toId)
}

function historyPosition (): number {
  const { position } = router.options.history.state
  return typeof position === 'number' ? position : 0
}

let lastPosition = historyPosition()

// 放 afterEach：這時 history.state 已經更新，而且被中止或重導的導覽不會留下錯誤的方向。
// afterEach 是同步的，仍然早於 Vue 的重新渲染，動畫不受影響
router.afterEach((to, from) => {
  const position = historyPosition()
  const wentBack = position < lastPosition
  lastPosition = position

  const toNav = navIndexOf(to.path)
  const fromNav = navIndexOf(from.path)

  if (toNav === -1) {
    transitionDir.value = sameRecordDirection(to, from) ?? (wentBack ? 'back' : 'forward')
  } else if (fromNav === -1 || toNav === fromNav) {
    transitionDir.value = 'back'
  } else {
    transitionDir.value = toNav < fromNav ? 'back' : 'forward'
  }

  // 登入後是 replace 掉登入頁，歷史上沒有 App 內的上一頁，所以重新從 1 算
  navigationCount.value = from.path === loginPath ? 1 : navigationCount.value + 1
})

// 新增動作可以帶預設值給目的地的表單。放 history.state 而不是網址
export function pushWithDefaults (path: string, defaults: Record<string, unknown>): void {
  void router.push({ path, state: { defaults } as HistoryState })
}

export function navigationDefaults<Row> (): Partial<Row> {
  const { defaults } = router.options.history.state
  return (defaults ?? {}) as Partial<Row>
}

export function leaveAfterAction (fallback: RouteLocationRaw): void {
  if (navigationCount.value > 1) {
    router.back()
  } else {
    void router.replace(fallback)
  }
}

export default router
