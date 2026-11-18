import { createTable, deleteTable } from '@/api'
import { useFilesStore } from '@/stores/files'
import { MOCK_TABLES_FILE, schemaFileOf } from '../../shared/tableFiles'
import { REGISTRY_FILE } from '../../shared/tableKeys'

// 新增與刪除表立即寫入。登記用的檔案或要刪除的檔案有未儲存的修改時不執行
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
  async function create (key: string, label: string, prefix: string): Promise<boolean> {
    if (!checkClean([REGISTRY_FILE, MOCK_TABLES_FILE], '新增表')) {
      return false
    }
    try {
      await createTable({ key, label, prefix })
    } catch (error) {
      files.message = (error as Error).message
      return false
    }
    await files.open(schemaFileOf(key))
    files.message = `已建立表「${label}」。請在 Config.gs 中登記這張表，線上測試與線上正式才讀得到這張表。`
    return true
  }

  /** paths 為要刪除的檔案。刪除成功時回傳 true */
  async function remove (key: string, paths: readonly string[]): Promise<boolean> {
    if (!checkClean([REGISTRY_FILE, MOCK_TABLES_FILE, ...paths], '刪除表')) {
      return false
    }
    try {
      await deleteTable(key)
    } catch (error) {
      files.message = (error as Error).message
      return false
    }
    return true
  }

  return { create, remove }
}
