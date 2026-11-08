// 假的 router，行為與瀏覽器的 history 相同：返回與前進為非同步，且 state 先更新才執行守衛。推入與取代則相反
// 測試檔以 vi.mock 將 @/router 的 default 換成此物件

type Guard = () => unknown
type AfterGuard = (to: object, from: object, failure?: object) => void

interface Entry {
  fullPath: string
  state: Record<string, unknown>
}

interface Target {
  path: string
  state?: Record<string, unknown>
}

const ABORTED = { type: 'aborted' }

export function createFakeRouter () {
  let entries: Entry[] = [{ fullPath: '/list', state: { position: 0 } }]
  let index = 0
  let blockedPops = 0
  const before: Guard[] = []
  const after: AfterGuard[] = []

  async function runGuards (): Promise<boolean> {
    for (const guard of before) {
      if (await guard() === false) {
        return false
      }
    }
    return true
  }

  function runAfter (failure?: object) {
    const route = { fullPath: entries[index]!.fullPath }
    for (const guard of after) {
      guard(route, route, failure)
    }
  }

  async function navigate (target: string | Target, replace: boolean) {
    if (!await runGuards()) {
      runAfter(ABORTED)
      return ABORTED
    }

    const location = typeof target === 'string' ? { path: target } : target
    const position = replace ? index : index + 1
    const entry = { fullPath: location.path, state: { ...location.state, position } }
    entries = [...entries.slice(0, position), entry]
    index = position
    runAfter()
    return undefined
  }

  function go (delta: number) {
    setTimeout(async () => {
      const previous = index
      const next = index + delta
      if (next < 0 || next >= entries.length) {
        return
      }
      index = next

      if (blockedPops > 0 || !await runGuards()) {
        blockedPops = Math.max(blockedPops - 1, 0)
        index = previous
        runAfter(ABORTED)
        return
      }
      runAfter()
    })
  }

  return {
    options: { history: { get state () {
      return entries[index]!.state
    } } },
    currentRoute: { get value () {
      return { path: entries[index]!.fullPath, query: {}, hash: '' }
    } },
    beforeEach: (guard: Guard) => {
      before.push(guard)
    },
    afterEach: (guard: AfterGuard) => {
      after.push(guard)
    },
    push: (target: string | Target) => navigate(target, false),
    replace: (target: string | Target) => navigate(target, true),
    go,
    back: () => go(-1),
    forward: () => go(1),

    // 以下只供測試使用
    reset () {
      entries = [{ fullPath: '/list', state: { position: 0 } }]
      index = 0
      blockedPops = 0
      before.length = 0
      after.length = 0
    },
    get index () {
      return index
    },
    get entries () {
      return entries
    },
    setPageState (state: Record<string, unknown>) {
      entries[index]!.state = { ...entries[index]!.state, ...state }
    },
    // 下一次返回被覆蓋層擋下（例如開啟中的選單）
    blockNextPop () {
      blockedPops = 1
    },
    // 重新整理：記憶體清空後 history 仍在，首次導覽只執行 afterEach
    reloadAt (history: Entry[], position: number) {
      entries = history
      index = position
      runAfter()
    },
  }
}
