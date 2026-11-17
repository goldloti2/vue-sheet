import type { TypeScript } from '../server/tableLabels'
import type { VueLanguageTools } from '../server/vueBuild'
import { mkdir, mkdtemp, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCodeLanguageService } from '../server/languageService'
import { loadTypeScript, loadVueLanguageTools } from '../server/vueBuild'
import { hasTypeScriptService } from '../shared/typescript'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

describe('hasTypeScriptService', () => {
  it('covers .ts and .vue files in vue-build/src only', () => {
    expect(hasTypeScriptService('vue-build/src/schema/tables/order.ts')).toBe(true)
    expect(hasTypeScriptService('vue-build/src/pages/order/index.vue')).toBe(true)
    expect(hasTypeScriptService('apps-script/Config.gs')).toBe(false)
    expect(hasTypeScriptService('vue-build/mock/order.csv')).toBe(false)
  })
})

// 於暫存資料夾建立一個小專案。node_modules 連結至 vue-build 的套件，只讀取
describe('createCodeLanguageService', () => {
  let ts: TypeScript
  let vue: VueLanguageTools
  let root: string
  const file = (name: string) => path.join(root, 'src', name)
  const create = () => createCodeLanguageService(ts, vue, path.join(root, 'tsconfig.json'))

  beforeAll(async () => {
    ts = await loadTypeScript(vueBuildRoot)
    vue = await loadVueLanguageTools(vueBuildRoot)
    root = await mkdtemp(path.join(tmpdir(), 'editor-ts-'))
    await mkdir(path.join(root, 'src'))
    await symlink(path.join(vueBuildRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
    await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { strict: true, module: 'ESNext', moduleResolution: 'bundler', noEmit: true, lib: ['ES2023'] },
      include: ['src/**/*'],
    }))
    await writeFile(file('globals.d.ts'), 'declare const APP_NAME: string\n')
    await writeFile(file('a.ts'), 'export const count = 1\n')
    await writeFile(file('b.ts'), 'import { count } from \'./a\'\nexport const label: string = count\n')
    await writeFile(file('Page.vue'), '<script lang="ts">\nexport interface Item { name: string }\n</script>\n\n<template><div /></template>\n')
    await writeFile(file('c.ts'), 'import type { Item } from \'./Page.vue\'\nexport const item: Item = { name: \'a\' }\n')
  }, 30_000)

  // 先移除 node_modules 的連結，再刪除暫存資料夾，不碰 vue-build 的套件
  afterAll(async () => {
    await unlink(path.join(root, 'node_modules'))
    await rm(root, { recursive: true, force: true })
  })

  it('reports type errors with their range', () => {
    const service = create()
    const text = 'import { count } from \'./a\'\nexport const label: string = count\n'

    const [diagnostic] = service.diagnostics(file('b.ts'), text)

    expect(diagnostic).toMatchObject({ severity: 'error', code: 2322 })
    expect(text.slice(diagnostic!.from, diagnostic!.to)).toBe('label')
  })

  it('includes the declaration files listed by tsconfig', () => {
    expect(create().diagnostics(file('d.ts'), 'export const name: string = APP_NAME\n')).toEqual([])
  })

  it('uses unsaved text of other files', () => {
    const service = create()
    service.diagnostics(file('a.ts'), 'export const count = \'one\'\n')

    expect(service.diagnostics(file('b.ts'), 'import { count } from \'./a\'\nexport const label: string = count\n')).toEqual([])
  })

  it('reads types exported from .vue files', () => {
    const service = create()
    const text = 'import type { Item } from \'./Page.vue\'\nexport const item: Item = { name: 1 }\n'

    const [diagnostic] = service.diagnostics(file('c.ts'), text)

    expect(diagnostic).toMatchObject({ code: 2322 })
    expect(text.slice(diagnostic!.from, diagnostic!.to)).toBe('name')
  })

  it('maps .vue diagnostics back to the source', () => {
    const service = create()
    const text = '<script setup lang="ts">\nconst count: number = \'x\'\n</script>\n\n<template><div>{{ count }}</div></template>\n'

    const errors = service.diagnostics(file('Page.vue'), text).filter(diagnostic => diagnostic.code === 2322)

    expect(errors.map(diagnostic => text.slice(diagnostic.from, diagnostic.to))).toEqual(['count'])
  })

  it('completes members at the cursor', () => {
    const service = create()
    const text = 'import { count } from \'./a\'\ncount.toFi'

    const completions = service.completions(file('b.ts'), text, text.length)

    expect(completions.entries.map(entry => entry.name)).toContain('toFixed')
  })
})
