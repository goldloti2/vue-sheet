import type { BuildEvent, BuildStatus, Problem, VueTscStatus } from '../../shared/checks'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { fetchChecks, onServerEvent, startBuild } from '@/api'
import { BUILD_EVENT, ESLINT_EVENT, MAX_BUILD_LINES, VUE_TSC_EVENT } from '../../shared/checks'
import { useFilesStore } from './files'
import { usePreviewStore } from './preview'

interface ProblemSources {
  /** 檔案的路徑對應即時檢查的問題 */
  live: ReadonlyMap<string, readonly Problem[]>
  eslint: readonly Problem[]
  vueTsc: readonly Problem[]
  vite: Problem | null
  /** 有未儲存修改的檔案 */
  dirtyPaths: ReadonlySet<string>
}

function compareProblems (a: Problem, b: Problem): number {
  if (a.path !== b.path) {
    if (a.path === null || b.path === null) {
      return a.path === null ? 1 : -1
    }
    return a.path < b.path ? -1 : 1
  }
  return (a.position?.line ?? 0) - (b.position?.line ?? 0) || (a.position?.column ?? 0) - (b.position?.column ?? 0)
}

// 未儲存的檔案以即時檢查為準，其他檔案以 vue-tsc 為準。依路徑與位置排序，與檔案無關的問題在最後
export function mergeProblems ({ live, eslint, vueTsc, vite, dirtyPaths }: ProblemSources): Problem[] {
  const livePaths = new Set([...live.keys()].filter(path => dirtyPaths.has(path)))
  return [
    ...[...livePaths].flatMap(path => live.get(path) ?? []),
    ...vueTsc.filter(problem => problem.path === null || !livePaths.has(problem.path)),
    ...eslint,
    ...(vite ? [vite] : []),
  ].toSorted(compareProblems)
}

export const useProblemsStore = defineStore('problems', () => {
  const files = useFilesStore()
  const preview = usePreviewStore()

  // 即時檢查涵蓋的檔案，沒有問題的檔案也列入
  const live = shallowRef(new Map<string, Problem[]>())
  const eslint = shallowRef<Problem[]>([])
  const vueTsc = shallowRef<VueTscStatus>({ state: 'starting', problems: [], error: null })
  const build = shallowRef<BuildStatus>({ state: 'idle', lines: [] })

  const problems = computed(() => mergeProblems({
    live: live.value,
    eslint: eslint.value,
    vueTsc: vueTsc.value.problems,
    vite: preview.viteProblem,
    dirtyPaths: files.dirtyPaths,
  }))

  function setLive (path: string, next: Problem[]): void {
    live.value = new Map(live.value).set(path, next)
  }

  async function load (): Promise<void> {
    const snapshot = await fetchChecks()
    eslint.value = snapshot.eslint
    vueTsc.value = snapshot.vueTsc
    build.value = snapshot.build
  }

  async function runBuild (): Promise<void> {
    try {
      await startBuild()
    } catch (error) {
      files.message = (error as Error).message
    }
  }

  function applyBuildEvent (event: BuildEvent): void {
    if (event.kind === 'state') {
      build.value = { state: event.state, lines: event.state === 'running' ? [] : build.value.lines }
      return
    }
    build.value = { ...build.value, lines: [...build.value.lines, event.text].slice(-MAX_BUILD_LINES) }
  }

  onServerEvent<Problem[]>(ESLINT_EVENT, next => {
    eslint.value = next
  })
  onServerEvent<VueTscStatus>(VUE_TSC_EVENT, next => {
    vueTsc.value = next
  })
  onServerEvent<BuildEvent>(BUILD_EVENT, applyBuildEvent)

  return { problems, vueTsc, build, setLive, load, runBuild }
})
