// 檔案區開啟的對象：一個檔案，或對應數個檔案的頁面。檔案以路徑識別，頁面以 page: 開頭的識別值識別

export interface EditorPage {
  /** 工具列與導覽中的名稱 */
  title: string
  /** 頁面讀寫的檔案。儲存與放棄修改皆涵蓋這些檔案 */
  paths: readonly string[]
}

/** 頁面的識別值對應頁面 */
export const EDITOR_PAGES: Readonly<Record<string, EditorPage>> = {}

/** 對象為頁面時回傳該頁面，為檔案時回傳 null */
export function pageOf (target: string): EditorPage | null {
  return Object.hasOwn(EDITOR_PAGES, target) ? EDITOR_PAGES[target]! : null
}

/** 對象讀寫的檔案。檔案為自己，頁面為頁面的檔案 */
export function targetPaths (target: string): string[] {
  return [...pageOf(target)?.paths ?? [target]]
}
