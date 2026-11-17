import { onBeforeUnmount, type Ref, shallowRef, watch } from 'vue'

// 元素的內容寬高，隨 ResizeObserver 更新
export function useElementSize (target: Readonly<Ref<HTMLElement | null>>) {
  const width = shallowRef(0)
  const height = shallowRef(0)
  const observer = new ResizeObserver(([entry]) => {
    if (entry) {
      width.value = entry.contentRect.width
      height.value = entry.contentRect.height
    }
  })

  watch(target, (element, previous) => {
    if (previous) {
      observer.unobserve(previous)
    }
    if (element) {
      observer.observe(element)
    }
  }, { immediate: true })
  onBeforeUnmount(() => observer.disconnect())

  return { width, height }
}
