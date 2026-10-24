// 換頁與 dashboard 面板內轉場的共用函式，CSS 位於 App.vue（見 docs/topics/pages.md 的「換頁動畫」）

// page：換頁時整個畫面左右滑動。panel：dashboard 面板內，只有命名的面板有動畫
export type TransitionKind = 'page' | 'panel'
export type TransitionDirection = 'forward' | 'back'

export interface PendingTransition {
  // DOM 已更新時呼叫，截取新畫面並播放
  finish: () => void
  // 畫面未改變時呼叫，略過動畫
  skip: () => void
  // 動畫結束或被略過時 resolve
  finished: Promise<void>
}

// 瀏覽器不支援 View Transitions，或系統開啟「減少動態效果」時不播放
export function canAnimate (): boolean {
  return 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 寫入 <html> 的 data-transition 與 data-dir，CSS 於動畫開始時讀取。沒有方向時移除 data-dir
export function markTransition (kind: TransitionKind, direction: TransitionDirection | null): void {
  const root = document.documentElement
  root.dataset.transition = kind
  if (direction) {
    root.dataset.dir = direction
  } else {
    delete root.dataset.dir
  }
}

// 開始轉場：截取舊畫面後 resolve。呼叫端再修改 DOM，完成後呼叫 finish 或 skip
export function beginTransition (): Promise<PendingTransition> {
  return new Promise(resolve => {
    const transition = document.startViewTransition(() => new Promise<void>(done => {
      resolve({
        finish: done,
        skip: () => {
          transition.skipTransition()
          done()
        },
        finished: transition.finished,
      })
    }))
  })
}
