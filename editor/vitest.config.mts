import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 只測試不依賴畫面的程式：server/、shared/ 與 store。只沿用 vite.config.mts 的 @ alias
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
