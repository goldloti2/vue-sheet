import { onUnmounted } from 'vue'

interface UseLongPressOptions {
  delay?: number
}

export function useLongPress (onLongPress: (event: PointerEvent) => void, options: UseLongPressOptions = {}) {
  const delay = options.delay ?? 500
  let timer: ReturnType<typeof setTimeout> | undefined
  let triggered = false

  function clear () {
    clearTimeout(timer)
    timer = undefined
  }

  function start (event: PointerEvent) {
    clear()
    triggered = false
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

  onUnmounted(clear)

  return {
    onClick,
    onPointercancel: clear,
    onPointerdown: start,
    onPointerleave: clear,
    onPointerup: clear,
  }
}
