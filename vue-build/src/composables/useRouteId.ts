import type { Ref } from 'vue'
import { getCurrentInstance, shallowRef } from 'vue'
import { useRoute } from 'vue-router'

export function useRouteId (): Ref<string> {
  const route = useRoute()
  const { id } = route.params as Record<string, string | string[] | undefined>
  const routeId = shallowRef(Array.isArray(id) ? id[0] ?? '' : id ?? '')

  if (import.meta.env.DEV) {
    warnIfUnkeyed(route.fullPath)
  }

  return routeId
}

function warnIfUnkeyed (fullPath: string): void {
  const key = getCurrentInstance()?.vnode.key

  if (key !== fullPath) {
    console.warn(
      `[useRouteId] 這個實例的 key 是 ${String(key)}，不是目前的網址 "${fullPath}"。`
      + 'useRouteId 假設實例與網址一對一：請確認它是在路由頁面自己的 setup 裡呼叫，'
      + '而且 App.vue 的 <component :key="route.fullPath"> 還在。',
    )
  }
}
