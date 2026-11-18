import type { RegistryEdit, RegistryModel } from '../../shared/registry'
import { shallowRef, toValue, watch } from 'vue'
import { editRegistry, parseRegistryText } from '@/api'
import { useFilesStore } from '@/stores/files'

// 總覽（schema/index.ts）的表單。修改寫入記憶體中的內容，按儲存才寫入檔案
export function useRegistryForm (pathSource: () => string, textSource: () => string) {
  const files = useFilesStore()
  const model = shallowRef<RegistryModel | null | undefined>(undefined)
  let modelText: string | null = null
  let queue: Promise<unknown> = Promise.resolve()

  watch(textSource, async text => {
    if (text === modelText) {
      return
    }
    const parsed = await parseRegistryText(text).catch(() => null)
    if (text === toValue(textSource)) {
      model.value = parsed
      modelText = text
    }
  }, { immediate: true })

  /** 依序套用。失敗時以提示顯示錯誤訊息 */
  const apply = (edits: RegistryEdit[]): Promise<void> => {
    const run = queue.then(async () => {
      const path = toValue(pathSource)
      try {
        const result = await editRegistry({ text: toValue(textSource), edits })
        model.value = result.model
        modelText = result.text
        files.setText(path, result.text)
        files.syncPreviewSoon(path)
      } catch (error) {
        files.message = (error as Error).message
      }
    })
    queue = run
    return run
  }

  return { model, apply }
}
