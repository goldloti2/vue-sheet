import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLongPress } from './useLongPress'

interface UseRowClickOptions {
  to: () => string | undefined
  selectable: () => boolean
  selectMode: () => boolean
  onLongpress: (event: PointerEvent) => void
  onToggle: () => void
}

// 列表中的一列（DataList、DataProfile）的點擊：長按進入多選、多選模式下切換勾選，其餘導覽至 to。
// 連結為自行組 href 的 <a>，不使用 RouterLink（理由見 docs/components/DataList.md）
export function useRowClick (options: UseRowClickOptions) {
  const router = useRouter()
  const longPress = useLongPress(options.onLongpress)

  const href = computed(() => {
    const path = options.to()
    return path ? router.options.history.base + path : undefined
  })

  function onClick (event: MouseEvent) {
    longPress.onClick(event)
    if (event.defaultPrevented) {
      return
    }

    if (options.selectMode()) {
      event.preventDefault()
      options.onToggle()
      return
    }

    // 帶修飾鍵或非左鍵時交由瀏覽器處理，開新分頁或新視窗即維持原生行為
    const path = options.to()
    if (!path || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    void router.push(path)
  }

  // 未開啟多選時不綁長按用的 pointer 監聽，文字選取與拖曳維持原生行為
  const pointerHandlers = computed(() => options.selectable()
    ? {
        onPointercancel: longPress.onPointercancel,
        onPointerdown: longPress.onPointerdown,
        onPointerleave: longPress.onPointerleave,
        onPointerup: longPress.onPointerup,
      }
    : {})

  return { href, onClick, pointerHandlers }
}
