import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 只沿用 vite.config.mts 的 @ alias，不載入 Vue、Vuetify、字型與路由的外掛
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  // 不讀取 .env：未設定 VITE_APPS_SCRIPT_URL 時，services 使用假後端
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
