// 假的 router，行為與瀏覽器的 history 相同：返回與前進為非同步，且 state 先更新才執行守衛。推入與取代則相反
// 測試檔以 vi.mock 將 @/router 的 default 換成此物件

type Guard = (to: { fullPath: string }) => unknown
type AfterGuard = (to: object, from: object, failure?: object) => void

interface Entry {
  fullPath: string
  state: Record<string, unknown>
}

interface Target {
  path: string
  state?: Record<string, unknown>
  force?: boolean
}

const ABORTED = { type: 'aborted' }
const DUPLICATED = { type: 'duplicated' }

export function createFakeRouter () {
  let entries: Entry[] = [{ fullPath: '/list', state: { position: 0 } }]
  let index = 0
  let blockedPops = 0
  const before: Guard[] = []
  const after: AfterGuard[] = []

  async function runGuards (fullPath: string): Promise<boolean> {
    for (const guard of before) {
      if (await guard({ fullPath }) === false) {
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
    const location: Target = typeof target === 'string' ? { path: target } : target
    // 與 vue-router 相同：網址與目前相同且沒有 force 時不導覽，只執行 afterEach
    if (!location.force && location.path === entries[index]!.fullPath) {
      runAfter(DUPLICATED)
      return DUPLICATED
    }
    if (!await runGuards(location.path)) {
      runAfter(ABORTED)
      return ABORTED
    }

    const position = replace ? index : index + 1
    // 與 vue-router 相同：取代沿用目前這一格的 state，推入不沿用
    const kept = replace ? entries[index]!.state : {}
    const entry = { fullPath: location.path, state: { ...kept, ...location.state, position } }
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

      if (blockedPops > 0 || !await runGuards(entries[index]!.fullPath)) {
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
      return { path: entries[index]!.fullPath, fullPath: entries[index]!.fullPath, query: {}, hash: '' }
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
