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
