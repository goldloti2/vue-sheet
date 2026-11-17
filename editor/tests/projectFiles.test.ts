import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { absolutePath, isProjectFile, listProjectFiles, ScopeError } from '../server/projectFiles'

describe('isProjectFile', () => {
  it('accepts the project locations', () => {
    expect(isProjectFile('vue-build/src/pages/order/[id]/index.vue')).toBe(true)
    expect(isProjectFile('vue-build/src/pages/order/_ref/OrderList.vue')).toBe(true)
    expect(isProjectFile('vue-build/src/schema/tables/order.ts')).toBe(true)
    expect(isProjectFile('vue-build/src/schema/index.ts')).toBe(true)
    expect(isProjectFile('vue-build/src/composables/actions/useOrderActions.ts')).toBe(true)
    expect(isProjectFile('vue-build/src/config/navigation.ts')).toBe(true)
    expect(isProjectFile('vue-build/src/services/mock/tables.ts')).toBe(true)
    expect(isProjectFile('vue-build/mock/order-test.csv')).toBe(true)
    expect(isProjectFile('apps-script/Config.gs')).toBe(true)
  })

  it('rejects framework files', () => {
    expect(isProjectFile('vue-build/src/schema/types.ts')).toBe(false)
    expect(isProjectFile('vue-build/src/composables/actions/useTableActions.ts')).toBe(false)
    expect(isProjectFile('vue-build/src/config/app.ts')).toBe(false)
    expect(isProjectFile('vue-build/src/services/mock/backend.ts')).toBe(false)
    expect(isProjectFile('apps-script/Code.gs')).toBe(false)
    expect(isProjectFile('PROJECT-ROADMAP.md')).toBe(false)
  })

  it('rejects paths that are not normalized', () => {
    expect(isProjectFile('vue-build/src/pages/../schema/types.ts')).toBe(false)
    expect(isProjectFile('./vue-build/src/schema/index.ts')).toBe(false)
    expect(isProjectFile('/vue-build/src/schema/index.ts')).toBe(false)
    expect(isProjectFile(String.raw`vue-build\src\schema\index.ts`)).toBe(false)
    expect(isProjectFile('vue-build/src/pages/../../mock/x.csv')).toBe(false)
  })

  it('throws for other paths when making an absolute path', () => {
    expect(() => absolutePath('/repo', 'vue-build/src/schema/types.ts')).toThrow(ScopeError)
    expect(absolutePath('/repo', 'apps-script/Config.gs')).toBe(path.join('/repo', 'apps-script', 'Config.gs'))
  })
})

describe('listProjectFiles', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'editor-files-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function touch (filePath: string): Promise<void> {
    await mkdir(path.dirname(path.join(root, filePath)), { recursive: true })
    await writeFile(path.join(root, filePath), '')
  }

  it('lists only project files, sorted', async () => {
    await touch('vue-build/src/pages/order/index.vue')
    await touch('vue-build/src/schema/tables/order.ts')
    await touch('vue-build/src/schema/types.ts')
    await touch('vue-build/src/composables/actions/useTableActions.ts')
    await touch('apps-script/Config.gs')
    await touch('apps-script/Code.gs')

    expect(await listProjectFiles(root)).toEqual([
      'apps-script/Config.gs',
      'vue-build/src/pages/order/index.vue',
      'vue-build/src/schema/tables/order.ts',
    ])
  })

  it('skips missing folders', async () => {
    expect(await listProjectFiles(root)).toEqual([])
  })
})
