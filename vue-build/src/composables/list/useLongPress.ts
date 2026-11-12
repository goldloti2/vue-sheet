import { onUnmounted } from 'vue'

interface UseLongPressOptions {
  delay?: number
}

export function useLongPress (onLongPress: (event: PointerEvent) => void, options: UseLongPressOptions = {}) {
  const delay = options.delay ?? 500
  let timer: ReturnType<typeof setTimeout> | undefined
  let triggered = false
  let touch = false

  function clear () {
    clearTimeout(timer)
    timer = undefined
  }

  function start (event: PointerEvent) {
    clear()
    triggered = false
    touch = event.pointerType === 'touch'
    timer = setTimeout(() => {
      triggered = true
      onLongPress(event)
    }, delay)
  }

  function onClick (event: MouseEvent) {
    if (triggered) {
      event.preventDefault()
    }
  }

  // 觸控按下時擋下瀏覽器的長按選單（例如連結的選單），滑鼠右鍵維持原生行為
  function onContextmenu (event: MouseEvent) {
    if (touch) {
      event.preventDefault()
    }
  }

  onUnmounted(clear)

  return {
    onClick,
    onContextmenu,
    onPointercancel: clear,
    onPointerdown: start,
    onPointerleave: clear,
    onPointerup: clear,
  }
}
