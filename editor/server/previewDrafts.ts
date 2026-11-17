// 預覽的草稿：預覽的 dev server 讀取有草稿的檔案時，改用草稿的內容
// 此檔由預覽的子程序以 Node 直接執行：只使用可移除的型別語法，只匯入型別
import type { Plugin } from 'vite'

/** 編輯器服務傳給預覽子程序的訊息。file 為絕對路徑，以 / 分隔。text 為 null 時改回檔案的內容 */
export interface PreviewDraftMessage {
  kind: 'draft'
  file: string
  text: string | null
}

const RAW_QUERY = /[?&]raw(?:&|$)/

// enforce: 'pre' 使 load 早於 Vite 讀檔，handleHotUpdate 早於 @vitejs/plugin-vue 讀檔
export function previewDrafts (drafts: ReadonlyMap<string, string>): Plugin {
  return {
    name: 'editor-preview-drafts',
    enforce: 'pre',
    load (id) {
      const [file, query] = id.split('?', 2)
      const draft = drafts.get(file ?? '')
      if (draft === undefined) {
        return null
      }
      if (query === undefined) {
        return draft
      }
      // 其他查詢（例如 .vue 的 ?vue&type=style）由原本的外掛處理
      return RAW_QUERY.test(`?${query}`) ? `export default ${JSON.stringify(draft)}` : null
    },
    // handleHotUpdate 與 @vitejs/plugin-vue 共用同一個 ctx，hotUpdate 則不共用
    handleHotUpdate (ctx) {
      const draft = drafts.get(ctx.file)
      if (draft !== undefined) {
        ctx.read = () => draft
      }
    },
  }
}
