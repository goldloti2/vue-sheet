// 檔案區開啟的對象：一個檔案，或對應數個檔案的頁面。檔案以路徑識別，頁面以 page: 開頭的識別值識別
import { APP_CONFIG_FILE } from './appConfig.ts'
import { CONFIG_FILE } from './configGs.ts'
import { NAVIGATION_FILE } from './navigationForm.ts'

export interface EditorPage {
  /** 工具列與導覽中的名稱 */
  title: string
  /** 頁面讀寫的檔案。儲存與放棄修改皆涵蓋這些檔案 */
  paths: readonly string[]
}

/** App 設定：app.ts 與 Config.gs 的各項設定 */
export const SETTINGS_PAGE = 'page:settings'

/** 頁面的識別值對應頁面 */
export const EDITOR_PAGES: Readonly<Record<string, EditorPage>> = {
  [SETTINGS_PAGE]: { title: 'App 設定', paths: [APP_CONFIG_FILE, CONFIG_FILE] },
}

/** 只有表單的檔案，不提供文字編輯器 */
export const FORM_ONLY_FILES: ReadonlySet<string> = new Set([APP_CONFIG_FILE, CONFIG_FILE, NAVIGATION_FILE])

/** 只在頁面中修改的檔案對應該頁面。開啟這些檔案時改為開啟頁面 */
export const FILE_PAGES: Readonly<Record<string, string>> = { [APP_CONFIG_FILE]: SETTINGS_PAGE }

/** 對象為頁面時回傳該頁面，為檔案時回傳 null */
export function pageOf (target: string): EditorPage | null {
  return Object.hasOwn(EDITOR_PAGES, target) ? EDITOR_PAGES[target]! : null
}

/** 對象讀寫的檔案。檔案為自己，頁面為頁面的檔案 */
export function targetPaths (target: string): string[] {
  return [...pageOf(target)?.paths ?? [target]]
}
