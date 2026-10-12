import { computed } from 'vue'
import { useRouter } from 'vue-router'

// 列表中作為連結的一列：自行組 href 的 <a>，不使用 RouterLink（理由見 docs/components/DataList.md）
export function useRowLink (to: () => string | undefined) {
  const router = useRouter()

  const href = computed(() => {
    const path = to()
    return path ? router.options.history.base + path : undefined
  })

  // 帶修飾鍵或非左鍵時交由瀏覽器處理，開新分頁或新視窗即維持原生行為
  function navigate (event: MouseEvent) {
    const path = to()
    if (!path || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    void router.push(path)
  }

  return { href, navigate }
}
