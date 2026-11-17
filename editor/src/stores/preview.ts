import type { Problem } from '../../shared/checks'
import type { ConsoleEntry, PreviewSource, PreviewStatus } from '../../shared/preview'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { fetchPreviewStatus, onServerEvent, putPreviewSource } from '@/api'
import { PREVIEW_LOG_EVENT, PREVIEW_STATUS_EVENT } from '../../shared/preview'

// 控制台只保留最近的訊息
export const MAX_CONSOLE_ENTRIES = 500

export const usePreviewStore = defineStore('preview', () => {
  const status = shallowRef<PreviewStatus | null>(null)
  const entries = shallowRef<ConsoleEntry[]>([])
  // 預覽目前的 Vite 錯誤，列於問題分頁
  const viteProblem = shallowRef<Problem | null>(null)

  async function load (): Promise<void> {
    status.value = await fetchPreviewStatus()
  }

  async function start (source: PreviewSource): Promise<void> {
    status.value = await putPreviewSource(source)
  }

  function addEntry (entry: ConsoleEntry): void {
    entries.value = [...entries.value, entry].slice(-MAX_CONSOLE_ENTRIES)
  }

  function clearEntries (): void {
    entries.value = []
  }

  function setViteProblem (problem: Problem | null): void {
    viteProblem.value = problem
  }

  // 預覽重新啟動時，上一個 Vite 錯誤已不適用
  onServerEvent<PreviewStatus>(PREVIEW_STATUS_EVENT, next => {
    if (next.state !== 'running') {
      viteProblem.value = null
    }
    status.value = next
  })
  onServerEvent<ConsoleEntry>(PREVIEW_LOG_EVENT, addEntry)

  return { status, entries, viteProblem, load, start, addEntry, clearEntries, setViteProblem }
})
