// 換頁與 dashboard 面板內的轉場共用的零件（View Transitions，CSS 在 App.vue；流程見 docs/topics/pages.md 的「換頁動畫」）

// page：換頁，整個畫面左右滑動；panel：dashboard 面板內，只有命名的面板有動畫
export type TransitionKind = 'page' | 'panel'
export type TransitionDirection = 'forward' | 'back'

export interface PendingTransition {
  // DOM 已更新：截下新畫面並播放
  finish: () => void
  // 畫面沒變：略過動畫
  skip: () => void
  // 動畫結束（或被略過）
  finished: Promise<void>
}

// 不支援 View Transitions，或系統開啟「減少動態效果」時不播
export function canAnimate (): boolean {
  return 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 寫入 <html> 的 data-transition 與 data-dir，CSS 於動畫開始時讀取；沒有方向時拿掉 data-dir
export function markTransition (kind: TransitionKind, direction: TransitionDirection | null): void {
  const root = document.documentElement
  root.dataset.transition = kind
  if (direction) {
    root.dataset.dir = direction
  } else {
    delete root.dataset.dir
  }
}

// 開始一次轉場：舊畫面截好後 resolve，之後才改 DOM，改完呼叫 finish（或 skip）
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
