import type { Ref } from 'vue'
import { shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useRouteId (): Ref<string> {
  const route = useRoute()
  const { id } = route.params as Record<string, string | string[] | undefined>
  const routeId = shallowRef(Array.isArray(id) ? id[0] ?? '' : id ?? '')

  if (import.meta.env.DEV) {
    warnIfReused(routeId)
  }

  return routeId
}

function warnIfReused (routeId: Ref<string>): void {
  const route = useRoute()
  const ownName = route.name

  watch(
    () => route.name === ownName
      ? (route.params as Record<string, string | string[] | undefined>).id
      : undefined,
    value => {
      if (typeof value === 'string' && value !== routeId.value) {
        console.warn(
          `[useRouteId] 同一個實例被 id "${routeId.value}" → "${value}" 重用了。`
          + 'useRouteId 假設實例與網址一對一，請確認 App.vue 的 <component :key="route.fullPath"> 還在。',
        )
      }
    },
  )
}
