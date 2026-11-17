<script lang="ts" setup>
  import type { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import { createEditorState, themeExtension, themeSlot } from './codeMirror'
  import { forgetInsertTarget, rememberInsertTarget } from './insertTarget'

  const props = defineProps<{
    path: string
    text: string
    /** 上次離開這個檔案時的狀態。內容與 text 不同時不使用 */
    initialState: EditorState | null
    /** 移至此位置並聚焦。行與欄從 1 起算 */
    reveal: { line: number, column: number } | null
  }>()

  const emit = defineEmits<{
    change: [path: string, text: string]
    leave: [path: string, state: EditorState]
    blur: [path: string]
    revealed: []
  }>()

  const host = useTemplateRef('host')
  const theme = useTheme()
  let view: EditorView | null = null

  const dark = () => theme.current.value.dark

  onMounted(() => {
    const reusable = props.initialState?.doc.toString() === props.text
    view = new EditorView({
      parent: host.value!,
      state: reusable ? props.initialState! : createEditorState(props.path, props.text, dark()),
      // 修改的通知不放在 state 中，保留的 state 換到新的元件實例時仍通知目前的實例
      dispatchTransactions: (transactions, target) => {
        target.update(transactions)
        if (transactions.some(transaction => transaction.docChanged)) {
          emit('change', props.path, target.state.doc.toString())
        }
      },
    })
    if (reusable) {
      view.dispatch({ effects: themeSlot.reconfigure(themeExtension(dark())) })
    }
    // 焦點的監聽同樣不放在 state 中
    const created = view
    view.contentDOM.addEventListener('blur', () => emit('blur', props.path))
    view.contentDOM.addEventListener('focus', () => rememberInsertTarget(created))
    rememberInsertTarget(view)
    revealPosition()
  })

  // 超出範圍的行與欄改為最接近的位置
  function revealPosition (): void {
    if (!view || !props.reveal) {
      return
    }
    const { doc } = view.state
    const line = doc.line(Math.min(Math.max(props.reveal.line, 1), doc.lines))
    const pos = Math.min(line.from + Math.max(props.reveal.column - 1, 0), line.to)
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
    view.focus()
    emit('revealed')
  }

  watch(() => props.reveal, revealPosition)

  // 放棄修改或重新讀取時，以新的內容取代
  watch(() => props.text, text => {
    if (view && view.state.doc.toString() !== text) {
      view.setState(createEditorState(props.path, text, dark()))
    }
  })

  watch(dark, value => {
    view?.dispatch({ effects: themeSlot.reconfigure(themeExtension(value)) })
  })

  onBeforeUnmount(() => {
    if (view) {
      emit('leave', props.path, view.state)
      forgetInsertTarget(view)
      view.destroy()
    }
  })
</script>

<template>
  <div ref="host" class="code-editor" />
</template>

<style scoped>
.code-editor {
  height: 100%;
  overflow: hidden;
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
