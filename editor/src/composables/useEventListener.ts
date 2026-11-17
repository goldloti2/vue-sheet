import { onBeforeUnmount, onMounted } from 'vue'

// 元件掛載時加上事件監聽，卸載時移除
export function useEventListener<K extends keyof WindowEventMap> (
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
): void {
  onMounted(() => target.addEventListener(type, listener))
  onBeforeUnmount(() => target.removeEventListener(type, listener))
}
