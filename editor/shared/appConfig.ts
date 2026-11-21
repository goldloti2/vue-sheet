// vue-build/src/config/app.ts 的解析結果與修改，服務與介面共用。只讀寫各設定項的值
import type { ConfigValue } from './configGs.ts'

export const APP_CONFIG_FILE = 'vue-build/src/config/app.ts'

/** 型別為字串字面值的 union 的設定 */
export type AppChoiceName = 'authMethod' | 'detailFieldLayout'

export interface AppConfigModel {
  appName: ConfigValue<string>
  authMethod: ConfigValue<string>
  detailFieldLayout: ConfigValue<string>
  /** null 為不啟用 */
  autoPushDelay: ConfigValue<number | null>
  /** 各設定的型別列出的值，依型別中的順序。型別不是字串字面值的 union 時為 null */
  options: Record<AppChoiceName, string[] | null>
}

/** 對 app.ts 的一項修改：取代設定項的值 */
export type AppConfigEdit
  = | { name: 'appName' | AppChoiceName, value: string }
    | { name: 'autoPushDelay', value: number | null }

export interface AppConfigEditRequest {
  text: string
  edits: AppConfigEdit[]
}

export interface AppConfigEditResult {
  text: string
  model: AppConfigModel
}

/** 登入方式：Config.gs 的 AUTH 與 app.ts 的 authMethod 須為同一組 */
export interface LoginOption {
  title: string
  auth: string | null
  authMethod: string
}

export const LOGIN_OPTIONS: readonly LoginOption[] = [
  { title: '不須登入', auth: null, authMethod: 'none' },
  { title: '密碼', auth: 'password', authMethod: 'custom' },
]

/** AUTH 與 authMethod 對應的登入方式。兩者不是同一組時為 null */
export function loginOptionOf (auth: string | null, authMethod: string): LoginOption | null {
  return LOGIN_OPTIONS.find(option => option.auth === auth && option.authMethod === authMethod) ?? null
}
