import type { TableKey } from '@/schema'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { fetchTable } from '@/services/appScript'

const pendingLoads = new Map<TableKey, Promise<void>>()

export const useTablesStore = defineStore('tables', () => {
  const rows = reactive<Partial<Record<TableKey, unknown[]>>>({})
  const loading = reactive<Partial<Record<TableKey, boolean>>>({})
  const error = reactive<Partial<Record<TableKey, string | null>>>({})

  async function load (table: TableKey) {
    const existing = pendingLoads.get(table)
    if (existing) {
      await existing
      return
    }

    const promise = (async () => {
      loading[table] = true
      error[table] = null
      try {
        rows[table] = await fetchTable<unknown>(table)
      } catch (loadError) {
        error[table] = loadError instanceof Error ? loadError.message : String(loadError)
      } finally {
        loading[table] = false
      }
    })()

    pendingLoads.set(table, promise)
    try {
      await promise
    } finally {
      pendingLoads.delete(table)
    }
  }

  async function ensureLoaded (table: TableKey) {
    if (table in rows) {
      return
    }
    await load(table)
  }

  async function refresh (table: TableKey) {
    await load(table)
  }

  return { rows, loading, error, ensureLoaded, refresh }
})
