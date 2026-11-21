import type { TypeScript } from '../server/vueBuild'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAppConfigEdits, parseAppConfig } from '../server/appConfig'
import { loadTypeScript } from '../server/vueBuild'
import { loginOptionOf } from '../shared/appConfig'

const vueBuildRoot = fileURLToPath(new URL('../../vue-build', import.meta.url))

let ts: TypeScript

beforeAll(async () => {
  ts = await loadTypeScript(vueBuildRoot)
}, 30_000)

const APP = [
  '// App 名稱',
  'export const appName = \'示範\'',
  '',
  '// 登入方式',
  'type AuthMethod = \'none\' | \'custom\' | \'google\'',
  'export const authMethod: AuthMethod = \'none\'',
  '',
  'export type DetailFieldLayout = \'side\' | \'stacked\'',
  'export const detailFieldLayout: DetailFieldLayout = \'side\'',
  '',
  'export const autoPushDelay: number | null = null',
  '',
].join('\n')

describe('parseAppConfig', () => {
  it('reads the values and the options listed by the types', () => {
    expect(parseAppConfig(ts, APP)).toEqual({
      appName: { kind: 'value', value: '示範' },
      authMethod: { kind: 'value', value: 'none' },
      detailFieldLayout: { kind: 'value', value: 'side' },
      autoPushDelay: { kind: 'value', value: null },
      options: { authMethod: ['none', 'custom', 'google'], detailFieldLayout: ['side', 'stacked'] },
    })
  })

  it('keeps other code as text, and has no options for other types', () => {
    const model = parseAppConfig(ts, 'export const appName = NAME\nexport const detailFieldLayout: string = \'side\'\nexport const autoPushDelay = 20')

    expect(model.appName).toEqual({ kind: 'code', text: 'NAME' })
    expect(model.options.detailFieldLayout).toBeNull()
    expect(model.autoPushDelay).toEqual({ kind: 'value', value: 20 })
    expect(model.authMethod).toBeNull()
  })
})

describe('applyAppConfigEdits', () => {
  it('changes only the values', () => {
    const text = applyAppConfigEdits(ts, APP, [
      { name: 'appName', value: '新名稱' },
      { name: 'authMethod', value: 'custom' },
      { name: 'autoPushDelay', value: 30 },
    ])

    expect(text).toBe(APP
      .replace('appName = \'示範\'', 'appName = \'新名稱\'')
      .replace('authMethod: AuthMethod = \'none\'', 'authMethod: AuthMethod = \'custom\'')
      .replace('autoPushDelay: number | null = null', 'autoPushDelay: number | null = 30'))
    expect(applyAppConfigEdits(ts, text, [{ name: 'autoPushDelay', value: null }])).toContain('autoPushDelay: number | null = null')
  })

  it('throws when a setting is missing or written as code', () => {
    expect(() => applyAppConfigEdits(ts, 'export const appName = NAME', [{ name: 'appName', value: 'A' }])).toThrow('以程式碼寫成')
    expect(() => applyAppConfigEdits(ts, APP.replace(/export const autoPushDelay.*\n/, ''), [{ name: 'autoPushDelay', value: 1 }])).toThrow('app.ts 中找不到 autoPushDelay')
  })
})

describe('loginOptionOf', () => {
  it('pairs null with none and password with custom', () => {
    expect(loginOptionOf(null, 'none')?.title).toBe('不須登入')
    expect(loginOptionOf('password', 'custom')?.title).toBe('密碼')
    expect(loginOptionOf('password', 'none')).toBeNull()
    expect(loginOptionOf(null, 'google')).toBeNull()
  })
})
