import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePublishListOrder } from '@/composables/navigation/useListOrder'
import { useLongPress } from './useLongPress'

interface UseRowClickOptions {
  to: () => string | undefined
  selectable: () => boolean
  selectMode: () => boolean
  onLongpress: (event: PointerEvent) => void
  onToggle: () => void
  // 為 true 時，點擊改為 onPick 而不導覽（dashboard 面板的 selects）
  pickable: () => boolean
  onPick: () => void
}

// 列表中一列的點擊：長按進入多選，多選模式下切換勾選，其餘發布列表順序後導覽至 to 或選取。連結為自行組成 href 的 <a>
export function useRowClick (options: UseRowClickOptions) {
  const router = useRouter()
  const longPress = useLongPress(options.onLongpress)
  const publishOrder = usePublishListOrder()

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

    // 帶修飾鍵或非左鍵的點擊交由瀏覽器處理，開新分頁或新視窗維持原生行為
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    if (options.pickable()) {
      event.preventDefault()
      publishOrder()
      options.onPick()
      return
    }

    const path = options.to()
    if (path) {
      event.preventDefault()
      publishOrder()
      void router.push(path)
    }
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
