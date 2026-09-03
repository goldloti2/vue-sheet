import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useRouteId () {
  const route = useRoute()
  const id = ref('')

  watch(
    () => (route.params as Record<string, string | string[] | undefined>).id,
    value => {
      if (value !== undefined) {
        id.value = Array.isArray(value) ? (value[0] ?? '') : value
      }
    },
    { immediate: true },
  )

  return id
}
