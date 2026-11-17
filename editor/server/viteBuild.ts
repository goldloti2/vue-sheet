import { spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { resolveBin } from './vueBuild.ts'

interface ViteBuildOptions {
  /** repo 的根目錄 */
  root: string
  /** 每一行輸出，含錯誤輸出 */
  onOutput: (text: string) => void
}

export interface ViteBuild {
  /** 建置成功時為 true */
  done: Promise<boolean>
  stop: () => void
}

// 於 vue-build 執行 vite build，輸出至 vue-build/dist
export function runViteBuild ({ root, onOutput }: ViteBuildOptions): ViteBuild {
  const vueBuildRoot = path.join(root, 'vue-build')
  const child = spawn(process.execPath, [resolveBin(vueBuildRoot, 'vite'), 'build'], {
    cwd: vueBuildRoot,
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  createInterface({ input: child.stdout }).on('line', onOutput)
  createInterface({ input: child.stderr }).on('line', onOutput)

  const kill = () => child.kill('SIGKILL')
  process.once('exit', kill)

  const done = new Promise<boolean>(resolve => {
    child.on('error', error => {
      onOutput(error.message)
      resolve(false)
    })
    // close 於輸出讀完後才發生，exit 可能早於最後幾行輸出
    child.on('close', code => resolve(code === 0))
  }).finally(() => process.off('exit', kill))

  return { done, stop: () => child.kill('SIGTERM') }
}
