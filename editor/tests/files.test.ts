import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hashText, readProjectFile, writeProjectFile } from '../server/files'
import { ScopeError } from '../server/projectFiles'

const FILE = 'vue-build/src/schema/tables/order.ts'

describe('project file read and write', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'editor-files-'))
    await mkdir(path.join(root, 'vue-build/src/schema/tables'), { recursive: true })
    await writeFile(path.join(root, FILE), 'old')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('reads the text with its hash', async () => {
    expect(await readProjectFile(root, FILE)).toEqual({ path: FILE, text: 'old', hash: hashText('old') })
    expect(await readProjectFile(root, 'vue-build/src/schema/tables/none.ts')).toBeNull()
  })

  it('writes when the base hash matches', async () => {
    const result = await writeProjectFile(root, FILE, 'new', hashText('old'))
    expect(result).toEqual({ ok: true, file: { path: FILE, text: 'new', hash: hashText('new') } })
    expect(await readFile(path.join(root, FILE), 'utf8')).toBe('new')
  })

  it('refuses when the file changed elsewhere', async () => {
    const result = await writeProjectFile(root, FILE, 'new', hashText('older'))
    expect(result).toEqual({ ok: false, file: { path: FILE, text: 'old', hash: hashText('old') } })
    expect(await readFile(path.join(root, FILE), 'utf8')).toBe('old')
  })

  it('creates a file only when it does not exist', async () => {
    const created = 'vue-build/src/pages/order/index.vue'
    expect((await writeProjectFile(root, created, 'page', null)).ok).toBe(true)
    expect(await readFile(path.join(root, created), 'utf8')).toBe('page')
    expect((await writeProjectFile(root, FILE, 'new', null)).ok).toBe(false)
  })

  it('writes the formatted text', async () => {
    const result = await writeProjectFile(root, FILE, 'new', hashText('old'), async (_absolute, text) => `${text}\n`)
    expect(result.ok && result.file.text).toBe('new\n')
    expect(await readFile(path.join(root, FILE), 'utf8')).toBe('new\n')
  })

  it('refuses paths outside the project', async () => {
    await expect(writeProjectFile(root, 'vue-build/src/schema/types.ts', 'x', null)).rejects.toThrow(ScopeError)
    await expect(readProjectFile(root, '../outside.ts')).rejects.toThrow(ScopeError)
  })
})
