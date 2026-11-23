import type { NewTableRequest, NewTableResult } from '../../shared/tableFiles'
import { createMockCsv, createTable, deleteTable } from '@/api'
import { useFilesStore } from '@/stores/files'
import { CONFIG_DEPLOY_MESSAGE, CONFIG_FILE } from '../../shared/configGs'
import { NAVIGATION_FILE } from '../../shared/navigationForm'
import { MOCK_TABLES_FILE, schemaFileOf } from '../../shared/tableFiles'
import { ACTIONS_REGISTRY_FILE, REGISTRY_FILE } from '../../shared/tableKeys'

// 新增與刪除表、建立 mock CSV 立即寫入。登記用的檔案或要刪除的檔案有未儲存的修改時不執行
export function useTableFiles () {
  const files = useFilesStore()

  // 有未儲存的修改時以提示列出，回傳 false
  function checkClean (paths: readonly string[], action: string): boolean {
    const dirty = paths.filter(path => files.dirtyPaths.has(path))
    if (dirty.length > 0) {
      files.message = `下列檔案有未儲存的修改。請先儲存或放棄修改，再${action}：${dirty.map(path => files.locationOf(path)).join('、')}`
      return false
    }
    return true
  }

  /** 建立成功時開啟新表的 schema，回傳 true */
  async function create (request: NewTableRequest): Promise<boolean> {
    if (!checkClean([REGISTRY_FILE, ACTIONS_REGISTRY_FILE, MOCK_TABLES_FILE, CONFIG_FILE], '新增表')) {
      return false
    }
    let result: NewTableResult
    try {
      result = await createTable(request)
    } catch (error) {
      files.message = (error as Error).message
      return false
    }
    await files.open(schemaFileOf(request.key))
    if (request.virtual) {
      files.message = `已建立虛擬表「${request.label}」。請在規則分頁加入規則。`
    } else {
      files.message = result.config
        ? `已建立表「${request.label}」，並登記於 Config.gs。${CONFIG_DEPLOY_MESSAGE}`
        : `已建立表「${request.label}」。請在 Config.gs 中登記這張表，線上測試與線上正式才讀得到這張表。`
    }
    return true
  }

  /** paths 為要刪除的檔案。刪除成功時回傳 true */
  async function remove (key: string, paths: readonly string[]): Promise<boolean> {
    if (!checkClean([REGISTRY_FILE, ACTIONS_REGISTRY_FILE, MOCK_TABLES_FILE, CONFIG_FILE, NAVIGATION_FILE, ...paths], '刪除表')) {
      return false
    }
    try {
      const result = await deleteTable(key)
      if (result.config) {
        files.message = CONFIG_DEPLOY_MESSAGE
      }
    } catch (error) {
      files.message = (error as Error).message
      return false
    }
    return true
  }

  /** 為表建立只有表頭的 mock CSV 並登記。成功時回傳 true */
  async function createCsv (key: string): Promise<boolean> {
    if (!checkClean([MOCK_TABLES_FILE], '建立 CSV')) {
      return false
    }
    try {
      await createMockCsv(key)
    } catch (error) {
      files.message = (error as Error).message
      return false
    }
    return true
  }

  return { create, remove, createCsv }
}
