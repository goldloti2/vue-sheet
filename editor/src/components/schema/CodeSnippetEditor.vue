<script lang="ts" setup>
  import type { CodeSurroundings } from '@/components/file/typeScript'
  import { closeBrackets } from '@codemirror/autocomplete'
  import { javascript } from '@codemirror/lang-javascript'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { minimalSetup } from 'codemirror'
  import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
  import { useTheme } from 'vuetify'
  import { themeExtension } from '@/components/file/codeMirror'
  import { forgetInsertTarget, rememberInsertTarget } from '@/components/file/insertTarget'
  import { snippetExtensions } from '@/components/file/typeScript'

  const props = defineProps<{
    /** 檔案的路徑，檢查與補全以此檔案為準 */
    path: string
    surroundings: () => CodeSurroundings | null
  }>()

  const model = defineModel<string>({ required: true })

  const host = useTemplateRef('host')
  const theme = useTheme()
  let view: EditorView | null = null

  onMounted(() => {
    view = new EditorView({
      parent: host.value!,
      state: EditorState.create({
        doc: model.value,
        extensions: [
          // 不顯示行號
          minimalSetup,
          closeBrackets(),
          javascript({ typescript: true }),
          snippetExtensions(props.path, props.surroundings),
          themeExtension(theme.current.value.dark),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              model.value = update.state.doc.toString()
            }
          }),
        ],
      }),
    })
    // 欄位查詢的雙擊插入至此處
    const created = view
    view.contentDOM.addEventListener('focus', () => rememberInsertTarget(created))
    rememberInsertTarget(view)
    view.focus()
  })

  onBeforeUnmount(() => {
    if (view) {
      forgetInsertTarget(view)
      view.destroy()
    }
  })
</script>

<template>
  <div ref="host" class="code-snippet-editor" />
</template>

<style scoped>
.code-snippet-editor :deep(.cm-editor) {
  min-height: 80px;
  max-height: 320px;
}

.code-snippet-editor :deep(.cm-content) {
  padding: 8px 4px;
}

.code-snippet-editor :deep(.cm-scroller) {
  overflow: auto;
}
</style>
