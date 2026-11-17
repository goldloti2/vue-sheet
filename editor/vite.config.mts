import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Vuetify from 'vite-plugin-vuetify'
import { editorService } from './server/service'

export default defineConfig({
  plugins: [
    Vue(),
    Vuetify({ autoImport: true }),
    editorService({ root: fileURLToPath(new URL('..', import.meta.url)) }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  server: {
    port: 3100,
  },
})
