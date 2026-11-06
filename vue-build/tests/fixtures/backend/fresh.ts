import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type * as Backend from '@/services/mock/backend'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { idHeader } from '@/schema/types'
import { schemas } from './schema'

// 測試檔須先以 vi.mock 將 @/schema、@/services/mock/tables 換成此資料夾中的版本，並將 @/config/app 的 authMethod 改為 'none'

// 每個測試前重新載入模組並建立新的 Pinia：假後端的資料、store 與連動中心的狀態皆回到初始值。store 由測試於此之後匯入
export async function freshBackend (): Promise<typeof Backend> {
  vi.resetModules()
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  setActivePinia(createPinia())
  return import('@/services/mock/backend')
}

// 假後端中一張表的一列，值為 Sheet 上的字串
export function sheetRow (backend: typeof Backend, table: TableKey, id: string) {
  const header = idHeader((schemas as Record<string, TableSchema>)[table]!)
  return backend.mockList(table).rows.find(row => row[header] === id)
}
