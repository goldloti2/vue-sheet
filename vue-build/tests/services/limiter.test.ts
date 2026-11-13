import { describe, expect, it } from 'vitest'
import { createLimiter } from '@/services/limiter'

// 由測試決定何時結束的工作
function deferred () {
  let finish!: () => void
  let fail!: (error: Error) => void
  const promise = new Promise<void>((resolve, reject) => {
    finish = resolve
    fail = reject
  })
  return { promise, finish, fail }
}

async function flushMicrotasks () {
  for (let round = 0; round < 5; round++) {
    await Promise.resolve()
  }
}

describe('createLimiter', () => {
  it('同時執行的工作不超過上限，超過的依呼叫順序開始', async () => {
    const limit = createLimiter(2)
    const tasks = [deferred(), deferred(), deferred(), deferred()]
    const started: number[] = []
    const results = tasks.map((task, index) => limit(async () => {
      started.push(index)
      await task.promise
      return index
    }))

    await flushMicrotasks()
    expect(started).toEqual([0, 1])

    tasks[1]!.finish()
    await flushMicrotasks()
    expect(started).toEqual([0, 1, 2])

    tasks[0]!.finish()
    tasks[2]!.finish()
    tasks[3]!.finish()
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3])
  })

  it('失敗的工作同樣讓出位置，錯誤照常拋出', async () => {
    const limit = createLimiter(1)
    const first = deferred()
    const failing = limit(() => first.promise)
    const next = limit(async () => 'next')

    first.fail(new Error('失敗'))
    await expect(failing).rejects.toThrow('失敗')
    expect(await next).toBe('next')
  })
})
