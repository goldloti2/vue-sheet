import type { Plugin } from 'vite'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import Fonts from 'unplugin-fonts/vite'
import { defineConfig } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import VueRouter from 'vue-router/vite'
import { appName } from './src/config/app.ts'

// 狀態列的顏色為 Vuetify 預設主題的 surface，即 App Bar 的底色
const themeColors = { light: '#FFFFFF', dark: '#212121' }

// 由 config/app.ts 產生 manifest，並於 index.html 寫入標題、圖示與狀態列的顏色。圖示位於 public/icons/（見 template/README.md）
function appManifest (): Plugin {
  let base = '/'
  const manifest = JSON.stringify({
    name: appName,
    short_name: appName,
    start_url: '.',
    scope: '.',
    display: 'standalone',
    background_color: themeColors.light,
    theme_color: themeColors.light,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2)

  return {
    name: 'app-manifest',
    configResolved (config) {
      base = config.base
    },
    configureServer (server) {
      server.middlewares.use(`${base}manifest.webmanifest`, (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest)
      })
    },
    generateBundle () {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
    },
    transformIndexHtml: () => [
      { tag: 'title', children: appName, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'icon', href: `${base}icons/favicon.ico` }, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${base}icons/apple-touch-icon.png` }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: themeColors.light }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: themeColors.dark }, injectTo: 'head' },
    ],
  }
}

const LICENSE_FILE = /^(?:licen[cs]e|copying)(?:\.|$)/i

// build 時產生 THIRD-PARTY-NOTICES.txt：public/icons/NOTICE.txt、實際打包的各套件的授權檔，以及 licenses/ 中對應授權的全文
function thirdPartyNotices (): Plugin {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle (_options, bundle) {
      // 只計入輸出中實際有內容的模組，以及資產（例如字型）的來源檔。被 tree-shaking 移除的模組不計入
      const sources = Object.values(bundle).flatMap(file => file.type === 'chunk'
        ? Object.entries(file.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id)
        : file.originalFileNames)
      const packages = new Map<string, string>()
      for (const id of sources) {
        const match = /^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//.exec(id.replaceAll('\\', '/'))
        if (match) {
          packages.set(match[2], match[1])
        }
      }

      const sections: string[] = []
      const licenses = new Set<string>()
      for (const [name, dir] of [...packages].toSorted(([a], [b]) => a.localeCompare(b))) {
        const { version, license } = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'))
        const file = readdirSync(dir).find(entry => LICENSE_FILE.test(entry))
        licenses.add(license)
        sections.push(`${name} ${version}\n授權：${license}\n\n${file ? readFileSync(`${dir}/${file}`, 'utf8').trim() : '（套件未附授權檔）'}`)
      }

      for (const license of [...licenses].toSorted()) {
        const path = `licenses/${license}.txt`
        if (existsSync(path)) {
          sections.push(`${license} 全文\n\n${readFileSync(path, 'utf8').trim()}`)
        }
      }

      const iconNotice = 'public/icons/NOTICE.txt'
      if (existsSync(iconNotice)) {
        sections.unshift(readFileSync(iconNotice, 'utf8').trim())
      }

      const rule = '='.repeat(64)
      const source = `第三方授權聲明\n\n此檔案於 build 時產生，列出 App 包含的第三方作品。\n\n${sections.map(section => `${rule}\n\n${section}\n`).join('\n')}`
      this.emitFile({ type: 'asset', fileName: 'THIRD-PARTY-NOTICES.txt', source })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // pages 中任意層的 _ref/ 只供其他頁面引用，不產生路由（見 docs/topics/search.md 的「同一頁面中的多張表」）
  plugins: [appManifest(), thirdPartyNotices(), VueRouter({ dts: 'src/typed-router.d.ts', exclude: ['src/pages/**/_ref/**'] }), Vue({
    template: { transformAssetUrls },
  }), // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
  Vuetify({
    autoImport: true,
    styles: {
      configFile: 'src/styles/settings.scss',
    },
  }), Fonts({
    fontsource: {
      families: [
        {
          name: 'Roboto',
          weights: [100, 300, 400, 500, 700, 900],
          styles: ['normal', 'italic'],
        },
      ],
    },
  })],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
})
