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

  onServerEvent<PreviewStatus>(PREVIEW_STATUS_EVENT, next => {
    status.value = next
  })
  onServerEvent<ConsoleEntry>(PREVIEW_LOG_EVENT, addEntry)

  return { status, entries, load, start, addEntry, clearEntries }
})
