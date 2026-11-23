// 由檔案的路徑取得表的代號。代號即 schema 檔的檔名，例如 orderLine

export const TABLES_DIR = 'vue-build/src/schema/tables/'
export const ACTIONS_DIR = 'vue-build/src/composables/actions/'
// schemas 所在的檔案，於導覽中為表的總覽
export const REGISTRY_FILE = 'vue-build/src/schema/index.ts'
// tableActions 所在的檔案：各表的動作的登記
export const ACTIONS_REGISTRY_FILE = 'vue-build/src/composables/actions/index.ts'

// schema 檔 tables/<代號>.ts
export function tableKeyOf (filePath: string): string | null {
  return /^vue-build\/src\/schema\/tables\/(\w+)\.ts$/.exec(filePath)?.[1] ?? null
}

// 動作檔 use<代號，首字大寫>Actions.ts
export function actionsTableKeyOf (filePath: string): string | null {
  const name = /^vue-build\/src\/composables\/actions\/use(\w+)Actions\.ts$/.exec(filePath)?.[1]
  return name ? name.charAt(0).toLowerCase() + name.slice(1) : null
}

// 頁面 pages/<資料夾>/…。資料夾是否為表的代號，由呼叫端比對
export function pageFolderOf (filePath: string): string | null {
  return /^vue-build\/src\/pages\/(\w+)\//.exec(filePath)?.[1] ?? null
}

// 檔案所屬的表：schema、動作，或頁面的資料夾。不屬於任何表時為 null
export function tableKeyOfFile (filePath: string, tableKeys: ReadonlySet<string>): string | null {
  const key = tableKeyOf(filePath) ?? actionsTableKeyOf(filePath) ?? pageFolderOf(filePath)
  return key !== null && tableKeys.has(key) ? key : null
}

// 表的動作函數名 use<代號，首字大寫>Actions，即動作檔的檔名
export function actionsNameOf (key: string): string {
  return `use${key.charAt(0).toUpperCase()}${key.slice(1)}Actions`
}

// 表的動作檔 use<代號，首字大寫>Actions.ts
export function actionsFileOf (key: string): string {
  return `${ACTIONS_DIR}${actionsNameOf(key)}.ts`
}
