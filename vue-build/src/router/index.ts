/**
 * router/index.ts
 *
 * Automatic routes for ./src/pages/*.vue
 */

import type { PendingTransition } from '@/composables/shell/viewTransition'
// Composables
import type { HistoryState, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { nextTick, shallowRef, watch } from 'vue'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { siblingDirection } from '@/composables/navigation/useListOrder'
import { beginTransition, canAnimate, markTransition } from '@/composables/shell/viewTransition'
import { authMethod } from '@/config/app'
import { drawerSections, navItems } from '@/config/navigation'
import { token } from '@/services/auth/token'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    // 無須登入即可瀏覽（登入頁本身）
    public?: boolean
    // false：不顯示 App Bar、側邊欄與底部導覽列
    shell?: boolean
  }
}

const loginPath = '/login'

// 每個網址最後的捲動位置（見 docs/topics/pages.md）。上限與 KeepAlive 的 max 相同，超過時移除最舊的
const scrollPositions = new Map<string, number>()
const MAX_SCROLL_POSITIONS = 50

function rememberScroll (fullPath: string): void {
  // 先刪除再加入，順序才會反映最近的使用
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
  // 優先使用瀏覽器的 savedPosition，其次為記錄的位置。未瀏覽過的頁面與相同網址的導覽回到頂端
  scrollBehavior (to, from, savedPosition) {
    if (savedPosition) {
      return { top: savedPosition.top }
    }
    return { top: to.fullPath === from.fullPath ? 0 : (scrollPositions.get(to.fullPath) ?? 0) }
  },
})

// 離開前記錄。此時畫面尚未切換，window.scrollY 仍為離開中的頁面的值
router.beforeEach((_to, from) => {
  rememberScroll(from.fullPath)
})

// 包含首次開啟（貼上網址、重新整理）：沒有 token 時前往登入頁，登入後回到原本的目的地
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

// token 被清除（登出、後端回報過期或無效）且目前的頁面須登入時，前往登入頁，登入後回到此頁
watch(token, value => {
  const current = router.currentRoute.value
  if (!value && authMethod !== 'none' && !current.meta.public) {
    void router.replace({ path: loginPath, query: { redirect: current.fullPath } })
  }
})

// App 內的導覽次數，首次載入為 1。大於 1 時才有 App 內的上一頁
export const navigationCount = shallowRef(0)

// 換頁動畫：截取舊畫面後才繼續導覽，DOM 更新後放行（見 docs/topics/pages.md 的「換頁動畫」）
let pending: PendingTransition | null = null

function settle (skip: boolean): void {
  const current = pending
  pending = null
  if (skip) {
    current?.skip()
  } else {
    current?.finish()
  }
}

router.beforeResolve(async (_to, from) => {
  // 上一次導覽因重導而未執行 afterEach 時，略過該次的動畫
  settle(true)
  if (from !== START_LOCATION && canAnimate()) {
    pending = await beginTransition()
  }
})

// 導覽失敗時略過動畫。成功時等 DOM 更新與捲動完成後放行
router.afterEach((_to, _from, failure) => {
  if (failure) {
    settle(true)
  } else {
    void nextTick(() => settle(false))
  }
})

// 導覽項目的順序：底部導覽列在前，側邊欄依組接在其後。兩處皆有的頁面以底部的位置為準
const navOrder = [...navItems, ...drawerSections.flatMap(section => section.items)].map(item => item.to)

// 換頁動畫的方向，判定規則見 docs/topics/pages.md 的「換頁動畫」
function navIndexOf (path: string): number {
  return navOrder.indexOf(path)
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

// 刻意置於 afterEach：此時 history.state 已更新，被中止或重導的導覽也不會留下錯誤的方向
router.afterEach((to, from) => {
  const position = historyPosition()
  const wentBack = position < lastPosition
  lastPosition = position

  const toNav = navIndexOf(to.path)
  const fromNav = navIndexOf(from.path)
  const historyDir = wentBack ? 'back' : 'forward'

  let dir: 'forward' | 'back'
  if (to.fullPath === from.fullPath) {
    dir = historyDir
  } else if (toNav === -1) {
    dir = sameRecordDirection(to, from) ?? historyDir
  } else if (fromNav === -1 || toNav === fromNav) {
    dir = 'back'
  } else {
    dir = toNav < fromNav ? 'back' : 'forward'
  }
  markTransition('page', dir)

  // 登入後以 replace 取代登入頁，沒有 App 內的上一頁，因此重新從 1 計算
  navigationCount.value = from.path === loginPath ? 1 : navigationCount.value + 1
})

// 新增動作可將預設值帶給目的地的表單。預設值置於 history.state，不置於網址
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
