// 由檔案的路徑取得表的代號。代號即 schema 檔的檔名，例如 orderLine

export const TABLES_DIR = 'vue-build/src/schema/tables/'
export const ACTIONS_DIR = 'vue-build/src/composables/actions/'

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
