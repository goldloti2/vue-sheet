// 限制同時執行的工作數。超過上限的工作依呼叫順序排隊，前面的工作結束後才開始
export function createLimiter (max: number) {
  let running = 0
  const waiting: (() => void)[] = []

  return async function limit<T> (task: () => Promise<T>): Promise<T> {
    if (running >= max) {
      await new Promise<void>(resolve => waiting.push(resolve))
    }
    running++

    try {
      return await task()
    } finally {
      running--
      waiting.shift()?.()
    }
  }
}
