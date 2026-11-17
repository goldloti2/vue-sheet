import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createFormatter } from '../server/vueBuild'

// 只讀取 vue-build 的 ESLint 設定。lintText 不讀寫 filePath 指向的檔案
const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

describe('createFormatter', () => {
  const format = createFormatter(vueBuildRoot)

  it('fixes the format with the vue-build ESLint config', async () => {
    const file = path.join(vueBuildRoot, 'src/schema/tables/__editor_format_test__.ts')
    expect(await format(file, 'export const a = {b: "c"};\n')).toBe('export const a = { b: \'c\' }\n')
  }, 30_000)

  it('keeps files outside vue-build and other extensions as they are', async () => {
    const outside = path.join(vueBuildRoot, '../apps-script/Config.gs')
    expect(await format(outside, 'const a = {b: "c"};')).toBe('const a = {b: "c"};')
    expect(await format(path.join(vueBuildRoot, 'mock/x.csv'), 'a,b')).toBe('a,b')
  })
})
