import type { ShallowRef } from 'vue'
import { shallowRef, toValue, watch } from 'vue'
import { useFilesStore } from '@/stores/files'

interface ParsedFormOptions<Model, Edit> {
  path: () => string
  text: () => string
  /** 解析目前的內容。內容不是表單能處理的寫法時為 null */
  parse: (text: string) => Promise<Model | null>
  /** 依序套用修改，回傳修改後的內容與解析結果 */
  edit: (text: string, edits: Edit[]) => Promise<{ text: string, model: Model | null }>
}

export interface ParsedForm<Model, Edit> {
  /** 讀取中為 undefined */
  model: Readonly<ShallowRef<Model | null | undefined>>
  /** 依序套用。失敗時以提示顯示錯誤訊息 */
  apply: (edits: Edit[]) => Promise<void>
}

// 以服務解析與修改的檔案的表單，例如總覽。修改寫入記憶體中的內容，按儲存才寫入檔案
export function useParsedForm<Model, Edit> ({ path, text, parse, edit }: ParsedFormOptions<Model, Edit>): ParsedForm<Model, Edit> {
  const files = useFilesStore()
  const model = shallowRef<Model | null | undefined>(undefined)
  let modelText: string | null = null
  let queue: Promise<unknown> = Promise.resolve()

  watch(text, async current => {
    if (current === modelText) {
      return
    }
    const parsed = await parse(current).catch(() => null)
    if (current === toValue(text)) {
      model.value = parsed
      modelText = current
    }
  }, { immediate: true })

  const apply = (edits: Edit[]): Promise<void> => {
    const run = queue.then(async () => {
      const filePath = toValue(path)
      try {
        const result = await edit(toValue(text), edits)
        model.value = result.model
        modelText = result.text
        files.setText(filePath, result.text)
        files.syncPreviewSoon(filePath)
      } catch (error) {
        files.message = (error as Error).message
      }
    })
    queue = run
    return run
  }

  return { model, apply }
}
